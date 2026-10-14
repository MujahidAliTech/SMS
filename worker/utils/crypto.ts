// ============================================================================
// Web Crypto API Security Utilities (Native Cloudflare Workers & Modern V8)
// ============================================================================

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

/**
 * Generate a cryptographically secure random hexadecimal string (for salts or session tokens).
 */
export function generateRandomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute SHA-256 hash of a string (used to store session tokens safely without plaintext exposure).
 */
export async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password using PBKDF2-SHA256 with an individual salt.
 */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const passBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison of two strings to prevent timing side-channel attacks.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify a candidate password against stored salt and expected hash.
 */
export async function verifyPassword(
  candidate: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  const candidateHash = await hashPassword(candidate, saltHex);
  return constantTimeEquals(candidateHash, expectedHashHex);
}
