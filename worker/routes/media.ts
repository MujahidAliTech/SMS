// ============================================================================
// Media & Profile Picture Route Handlers (Cloudflare R2 Secure Storage)
// Multi-Tenant School Management SaaS
// ============================================================================

import { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { authenticateRequest, requireRoles, enforceTenantScoping } from '../middleware/auth';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

type ImageFormat = {
  ext: string;
  mime: string;
};

/**
 * Inspect magic bytes of binary buffer to strictly verify image integrity
 */
function detectImageFormat(buffer: Uint8Array): ImageFormat | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

/**
 * Extracts binary image buffer from standard Fetch Request
 * Supports multipart/form-data or direct binary image body
 */
async function extractImageBuffer(request: Request): Promise<{ buffer: Uint8Array; contentType?: string } | null> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const file = formData.get('photo') || formData.get('file') || formData.get('image');
      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        const ab = await (file as Blob).arrayBuffer();
        return { buffer: new Uint8Array(ab), contentType: (file as Blob).type };
      }
    } catch (err) {
      console.warn('FormData parsing failed, falling back to arrayBuffer:', err);
    }
  }

  const ab = await request.arrayBuffer();
  if (ab && ab.byteLength > 0) {
    return { buffer: new Uint8Array(ab), contentType };
  }

  return null;
}

/**
 * POST /api/v1/students/:id/photo or POST /api/v1/teachers/:id/photo
 * Safely replaces avatar in Cloudflare R2 and updates D1 reference
 */
export async function handleUploadProfilePicture(
  entityType: 'students' | 'teachers',
  entityId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  // Only School Admin, Principal, or Super Admin can upload photos
  const roleError = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleError) return roleError;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  // 1. Check R2 storage binding
  if (!env.STORAGE) {
    return errorResponse(
      'Cloudflare R2 storage binding (STORAGE) is not configured in this environment.',
      503
    );
  }

  // 2. Verify target record exists in D1
  const tableName = entityType === 'students' ? 'students' : 'teachers_staff';
  const entity = await env.DB.prepare(`
    SELECT id, tenant_id, name, photo_key, photo_url
    FROM ${tableName}
    WHERE id = ? AND tenant_id = ?
    LIMIT 1
  `).bind(entityId, scopedTenantId).first<{
    id: string;
    tenant_id: string;
    name: string;
    photo_key: string | null;
    photo_url: string | null;
  }>();

  if (!entity) {
    return errorResponse(`${entityType === 'students' ? 'Student' : 'Staff'} record not found`, 404);
  }

  // 3. Extract and validate binary image
  const extracted = await extractImageBuffer(request);
  if (!extracted || extracted.buffer.length === 0) {
    return errorResponse('No image file detected in request payload. Please upload a valid picture.', 400);
  }

  if (extracted.buffer.length > MAX_IMAGE_SIZE_BYTES) {
    return errorResponse(
      `Image file size exceeds the 2 MB limit (${(extracted.buffer.length / (1024 * 1024)).toFixed(2)} MB uploaded). Please compress the photo.`,
      400
    );
  }

  // 4. Magic bytes validation
  const imageFormat = detectImageFormat(extracted.buffer);
  if (!imageFormat) {
    return errorResponse(
      'Invalid or corrupted image file format. Only authentic JPEG, PNG, and WebP images are permitted.',
      400
    );
  }

  // 5. Generate secure server-authoritative key
  const timestamp = Date.now();
  const newStorageKey = `tenants/${scopedTenantId}/${entityType}/${entityId}/photo-${timestamp}.${imageFormat.ext}`;
  const avatarApiUrl = `/api/v1/media/avatar/${entityType}/${entityId}?t=${timestamp}`;

  // 6. Safe image replacement workflow:
  // Step A: Upload to Cloudflare R2 first
  try {
    await env.STORAGE.put(newStorageKey, extracted.buffer, {
      httpMetadata: {
        contentType: imageFormat.mime,
        cacheControl: 'private, max-age=3600'
      }
    });
  } catch (r2Err) {
    console.error('R2 upload failed:', r2Err);
    return errorResponse(`Failed to write image to Cloudflare R2 storage: ${(r2Err as Error).message}`, 500);
  }

  // Step B: Update D1 database reference
  const oldPhotoKey = entity.photo_key;
  try {
    await env.DB.prepare(`
      UPDATE ${tableName}
      SET photo_key = ?, photo_url = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(newStorageKey, avatarApiUrl, entityId, scopedTenantId).run();
  } catch (d1Err) {
    // If D1 fails, clean up the newly uploaded R2 object to avoid orphans
    try {
      await env.STORAGE.delete(newStorageKey);
    } catch {}
    return errorResponse(`Failed to update profile image in database: ${(d1Err as Error).message}`, 500);
  }

  // Step C: Delete previous R2 object if one existed
  if (oldPhotoKey && oldPhotoKey !== newStorageKey) {
    try {
      await env.STORAGE.delete(oldPhotoKey);
    } catch (cleanupErr) {
      console.warn(`Orphaned old photo key cleanup warning: ${oldPhotoKey}`, cleanupErr);
    }
  }

  return jsonResponse({
    message: 'Profile picture uploaded successfully',
    photoUrl: avatarApiUrl,
    photoKey: newStorageKey,
    size: extracted.buffer.length,
    mimeType: imageFormat.mime
  }, 200, {}, scopedTenantId);
}

/**
 * DELETE /api/v1/students/:id/photo or DELETE /api/v1/teachers/:id/photo
 * Safely removes profile picture from R2 and clears D1 reference
 */
export async function handleDeleteProfilePicture(
  entityType: 'students' | 'teachers',
  entityId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const roleError = requireRoles(auth, ['school_admin', 'principal', 'super_admin']);
  if (roleError) return roleError;

  const url = new URL(request.url);
  const requestedTenantId = url.searchParams.get('tenantId');
  const scopedTenantId = enforceTenantScoping(auth, requestedTenantId);
  if (typeof scopedTenantId !== 'string') return scopedTenantId;

  const tableName = entityType === 'students' ? 'students' : 'teachers_staff';
  const entity = await env.DB.prepare(`
    SELECT id, tenant_id, name, photo_key
    FROM ${tableName}
    WHERE id = ? AND tenant_id = ?
    LIMIT 1
  `).bind(entityId, scopedTenantId).first<{
    id: string;
    tenant_id: string;
    name: string;
    photo_key: string | null;
  }>();

  if (!entity) {
    return errorResponse('Record not found', 404);
  }

  if (entity.photo_key && env.STORAGE) {
    try {
      await env.STORAGE.delete(entity.photo_key);
    } catch (err) {
      console.warn(`R2 photo deletion warning for key ${entity.photo_key}:`, err);
    }
  }

  await env.DB.prepare(`
    UPDATE ${tableName}
    SET photo_key = NULL, photo_url = NULL, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(entityId, scopedTenantId).run();

  return jsonResponse({
    message: 'Profile picture removed successfully',
    photoUrl: null,
    photoKey: null
  }, 200, {}, scopedTenantId);
}

/**
 * GET /api/v1/media/avatar/:entityType/:id
 * Private authorized stream of the image binary from Cloudflare R2
 */
export async function handleGetProfilePicture(
  entityType: 'students' | 'teachers',
  entityId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const { auth, error } = await authenticateRequest(request, env);
  if (error || !auth) {
    return error || errorResponse('Unauthorized', 401);
  }

  const tableName = entityType === 'students' ? 'students' : 'teachers_staff';
  const entity = await env.DB.prepare(`
    SELECT id, tenant_id, name, photo_key, photo_url
    FROM ${tableName}
    WHERE id = ?
    LIMIT 1
  `).bind(entityId).first<{
    id: string;
    tenant_id: string;
    name: string;
    photo_key: string | null;
    photo_url: string | null;
  }>();

  if (!entity) {
    return errorResponse('Image not found', 404);
  }

  // Cross-tenant protection: verify that requester belongs to the same tenant or is super_admin
  const scopedTenantId = enforceTenantScoping(auth, entity.tenant_id);
  if (typeof scopedTenantId !== 'string') {
    return scopedTenantId; // 403 Forbidden
  }

  if (!entity.photo_key || !env.STORAGE) {
    // If no custom R2 photo exists, return an SVG default avatar
    const initial = entity.name.charAt(0).toUpperCase() || '?';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#1e3a8a"/>
        <text x="50%" y="54%" font-family="system-ui, sans-serif" font-size="78" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
          ${initial}
        </text>
      </svg>
    `.trim();

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'private, max-age=86400'
      }
    });
  }

  const r2Object = await env.STORAGE.get(entity.photo_key);
  if (!r2Object) {
    return errorResponse('Image file not found in storage bucket', 404);
  }

  const buffer = await r2Object.arrayBuffer();
  const contentType = r2Object.httpMetadata?.contentType || 'image/jpeg';

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
