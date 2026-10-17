// ============================================================================
// Local SQLite Adapter for Cloudflare D1 & R2 Emulation in Node / Local Dev
// Implements the D1Database and R2Bucket interfaces natively
// using Node 22's built-in DatabaseSync (node:sqlite)
// ============================================================================

import { DatabaseSync, StatementSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { D1Database, D1PreparedStatement, D1Response, R2Bucket, R2ObjectBody, R2HttpMetadata, Env } from '../types';

class LocalD1PreparedStatement implements D1PreparedStatement {
  private stmt: StatementSync;
  private boundValues: unknown[] = [];

  constructor(stmt: StatementSync, boundValues: unknown[] = []) {
    this.stmt = stmt;
    this.boundValues = boundValues;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    return new LocalD1PreparedStatement(this.stmt, values);
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    try {
      const row = this.stmt.get(...(this.boundValues as any[])) as Record<string, unknown> | undefined;
      if (!row) return null;
      if (colName) return (row[colName] as T) ?? null;
      return row as T;
    } catch (err) {
      console.error('Local D1 first() error:', err, 'Query values:', this.boundValues);
      throw err;
    }
  }

  async all<T = unknown>(): Promise<D1Response<T>> {
    try {
      const rows = this.stmt.all(...(this.boundValues as any[])) as T[];
      return {
        results: rows,
        success: true,
        meta: {
          changes: 0,
          duration: 1
        }
      };
    } catch (err) {
      console.error('Local D1 all() error:', err, 'Query values:', this.boundValues);
      throw err;
    }
  }

  async run<T = unknown>(): Promise<D1Response<T>> {
    try {
      const result = this.stmt.run(...(this.boundValues as any[]));
      return {
        results: [],
        success: true,
        meta: {
          changes: Number(result.changes),
          last_row_id: Number(result.lastInsertRowid),
          duration: 1
        }
      };
    } catch (err) {
      console.error('Local D1 run() error:', err, 'Query values:', this.boundValues);
      throw err;
    }
  }
}

export class LocalD1Database implements D1Database {
  private db: DatabaseSync;

  constructor(dbPath?: string) {
    const finalPath = dbPath || path.resolve(process.cwd(), '.local-d1.sqlite');
    this.db = new DatabaseSync(finalPath);
    this.initPragmas();
    this.applyMigrations();
  }

  private initPragmas() {
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');
  }

  private applyMigrations() {
    try {
      // Check if users table exists
      const hasUsers = this.db.prepare(`
        SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='users'
      `).get() as { count: number };

      if (!hasUsers || hasUsers.count === 0) {
        console.log('[Local D1] Initializing schema and seed data...');
        const migration1 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0001_initial_schema.sql'), 'utf8');
        const migration2 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0002_seed_demo_data.sql'), 'utf8');
        this.db.exec(migration1);
        this.db.exec(migration2);
        console.log('[Local D1] Schema and demo data seeded successfully.');
      }

      // Check if photo_key columns exist on students and teachers_staff
      try {
        const studentCols = this.db.prepare("PRAGMA table_info('students')").all() as { name: string }[];
        const hasStudentPhotoKey = studentCols.some(c => c.name === 'photo_key');
        if (!hasStudentPhotoKey) {
          console.log('[Local D1] Applying migration 0003 for students.photo_key...');
          this.db.exec('ALTER TABLE students ADD COLUMN photo_key TEXT;');
        }

        const staffCols = this.db.prepare("PRAGMA table_info('teachers_staff')").all() as { name: string }[];
        const hasStaffPhotoKey = staffCols.some(c => c.name === 'photo_key');
        if (!hasStaffPhotoKey) {
          console.log('[Local D1] Applying migration 0003 for teachers_staff.photo_key...');
          this.db.exec('ALTER TABLE teachers_staff ADD COLUMN photo_key TEXT;');
        }

        // Check if attendance_records has recorded_by_user_id
        const attendanceCols = this.db.prepare("PRAGMA table_info('attendance_records')").all() as { name: string }[];
        const hasRecordedBy = attendanceCols.some(c => c.name === 'recorded_by_user_id');
        if (!hasRecordedBy) {
          console.log('[Local D1] Applying migration 0004 for attendance_records & attendance_corrections...');
          const migration4 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0004_attendance_audit_and_fields.sql'), 'utf8');
          this.db.exec(migration4);
        }
      } catch (err) {
        console.warn('[Local D1] Migration step warning/error:', err);
      }
    } catch (err) {
      console.error('[Local D1] Error applying migrations:', err);
    }
  }

  prepare(query: string): D1PreparedStatement {
    const stmt = this.db.prepare(query);
    return new LocalD1PreparedStatement(stmt);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Response<T>[]> {
    const results: D1Response<T>[] = [];
    for (const statement of statements) {
      results.push(await statement.run<T>());
    }
    return results;
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    this.db.exec(query);
    return { count: 1, duration: 1 };
  }
}

interface StoredR2Object {
  data: Uint8Array;
  contentType: string;
  size: number;
  uploadedAt: string;
}

/**
 * High-fidelity local simulation for Cloudflare R2 storage
 * Supports byte buffers, streaming conversions, and content-type metadata.
 */
export class LocalR2Bucket implements R2Bucket {
  private store = new Map<string, StoredR2Object>();

  async get(key: string): Promise<R2ObjectBody | null> {
    const item = this.store.get(key);
    if (!item) return null;

    return {
      key,
      size: item.size,
      httpMetadata: {
        contentType: item.contentType,
        cacheControl: 'private, max-age=3600'
      },
      arrayBuffer: async (): Promise<ArrayBuffer> => {
        const copy = new Uint8Array(item.data.byteLength);
        copy.set(item.data);
        return copy.buffer as ArrayBuffer;
      },
      text: async () => {
        return new TextDecoder().decode(item.data);
      }
    };
  }

  async put(
    key: string,
    value: unknown,
    options?: { httpMetadata?: R2HttpMetadata }
  ): Promise<{ key: string; size: number }> {
    let uint8: Uint8Array;

    if (value instanceof Uint8Array) {
      uint8 = value;
    } else if (value instanceof ArrayBuffer) {
      uint8 = new Uint8Array(value);
    } else if (typeof value === 'string') {
      uint8 = new TextEncoder().encode(value);
    } else if (Buffer.isBuffer(value)) {
      uint8 = new Uint8Array(value);
    } else {
      uint8 = new Uint8Array();
    }

    const contentType = options?.httpMetadata?.contentType || 'application/octet-stream';

    this.store.set(key, {
      data: uint8,
      contentType,
      size: uint8.byteLength,
      uploadedAt: new Date().toISOString()
    });

    return { key, size: uint8.byteLength };
  }

  async delete(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      key.forEach(k => this.store.delete(k));
    } else {
      this.store.delete(key);
    }
  }
}

let cachedEnv: Env | null = null;

export function getLocalWorkerEnv(): Env {
  if (!cachedEnv) {
    const db = new LocalD1Database();
    const storage = new LocalR2Bucket();
    cachedEnv = {
      DB: db,
      STORAGE: storage,
      ENVIRONMENT: 'development',
      API_VERSION: 'v1',
      APP_NAME: 'TaleemCloud SaaS (Local Dev)'
    };
  }
  return cachedEnv;
}
