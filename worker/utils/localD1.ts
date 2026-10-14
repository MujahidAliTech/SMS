// ============================================================================
// Local SQLite Adapter for Cloudflare D1 Emulation in Node / Local Dev
// Implements the D1Database and D1PreparedStatement interfaces natively
// using Node 22's built-in DatabaseSync (node:sqlite)
// ============================================================================

import { DatabaseSync, StatementSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { D1Database, D1PreparedStatement, D1Response, R2Bucket, Env } from '../types';

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

/**
 * Local in-memory mock for Cloudflare R2 storage
 */
export class LocalR2Bucket implements R2Bucket {
  private store = new Map<string, unknown>();

  async get(key: string): Promise<unknown | null> {
    return this.store.get(key) || null;
  }

  async put(key: string, value: unknown): Promise<unknown> {
    this.store.set(key, value);
    return { key, size: 100 };
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
