// ============================================================================
// Automated Test Suite for Stage 6: Fees, Invoices, Challans & Financial Reports
// ============================================================================

import { DatabaseSync } from 'node:sqlite';
import { Env, D1Database, D1PreparedStatement, D1Response } from '../worker/types';
import { sha256Hash } from '../worker/utils/crypto';
import {
  handleGetFeeHeads,
  handleCreateFeeHead,
  handleGetFeeStructures,
  handleSetFeeStructure,
  handleGetInvoices,
  handleGetInvoiceById,
  handleCreateInvoice,
  handleApplyConcession,
  handleRecordPayment,
  handleGetReceipt,
  handleReversePayment,
  handleGetStudentLedger,
  handleGetFinancialSummary,
  handleGetFeeAuditLogs
} from '../worker/routes/fees';

// 1. Create In-Memory or Test Database wrapper using node:sqlite
function createTestD1(db: DatabaseSync): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      return {
        bind(...values: unknown[]) {
          const flatValues = values.map(v => (v === undefined ? null : v));
          return {
            async first<T = unknown>(colName?: string): Promise<T | null> {
              const stmt = db.prepare(query);
              const row = stmt.get(...flatValues) as Record<string, unknown> | undefined;
              if (!row) return null;
              if (colName) return (row[colName] as T) ?? null;
              return row as unknown as T;
            },
            async all<T = unknown>(): Promise<D1Response<T>> {
              const stmt = db.prepare(query);
              const rows = stmt.all(...flatValues) as T[];
              return { results: rows, success: true, meta: { changes: 0 } };
            },
            async run<T = unknown>(): Promise<D1Response<T>> {
              const stmt = db.prepare(query);
              const info = stmt.run(...flatValues);
              return { results: [], success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
            },
            bind: () => this
          };
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          const stmt = db.prepare(query);
          const row = stmt.get() as Record<string, unknown> | undefined;
          if (!row) return null;
          if (colName) return (row[colName] as T) ?? null;
          return row as unknown as T;
        },
        async all<T = unknown>(): Promise<D1Response<T>> {
          const stmt = db.prepare(query);
          const rows = stmt.all() as T[];
          return { results: rows, success: true, meta: { changes: 0 } };
        },
        async run<T = unknown>(): Promise<D1Response<T>> {
          const stmt = db.prepare(query);
          const info = stmt.run();
          return { results: [], success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
        }
      };
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Response<T>[]> {
      const results: D1Response<T>[] = [];
      for (const s of statements) {
        results.push(await s.run<T>());
      }
      return results;
    },
    async exec(query: string): Promise<{ count: number; duration: number }> {
      db.exec(query);
      return { count: 1, duration: 0 };
    }
  };
}

async function getData<T = any>(res: Response): Promise<T> {
  const json = await res.json() as any;
  return json.data !== undefined ? json.data : json;
}

async function runTests() {
  console.log('--- Starting Stage 6 Fee Module Automated Test Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // Initialize DB instance using the existing .local-d1.sqlite
  const sqlite = new DatabaseSync('.local-d1.sqlite');
  const d1 = createTestD1(sqlite);
  const env: Env = {
    DB: d1,
    ENVIRONMENT: 'development'
  };

  const tenantId = 'tenant-bfs';
  const otherTenantId = 'tenant-alnoor';

  // Ensure other tenant admin exists
  const otherAdminId = 'user-admin-alnoor-st6';
  sqlite.prepare(`
    INSERT OR REPLACE INTO users (id, tenant_id, name, email, phone, role, is_active, created_at)
    VALUES (?, ?, 'Al-Noor Admin', 'admin@alnoor.edu.pk', '03009999999', 'school_admin', 1, datetime('now'))
  `).run(otherAdminId, otherTenantId);

  // Helper to create test session and return Authorization header
  async function createSession(userId: string, targetTenantId: string, role: string): Promise<string> {
    const rawToken = `test-token-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const tokenHash = await sha256Hash(rawToken);
    const sessionId = `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    sqlite.prepare(`
      INSERT INTO user_sessions (id, user_id, tenant_id, role, token_hash, ip_address, user_agent, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, '127.0.0.1', 'AutomatedTest/1.0', datetime('now'), ?)
    `).run(sessionId, userId, targetTenantId, role, tokenHash, expiresAt);

    return `Bearer ${rawToken}`;
  }

  const accountantAuth = await createSession('user-accountant-bfs', tenantId, 'accountant');
  const adminAuth = await createSession('user-admin-bfs', tenantId, 'school_admin');
  const teacherAuth = await createSession('user-teacher-bfs', tenantId, 'teacher');
  const parentAuth = await createSession('user-parent-bfs', tenantId, 'parent');
  const studentAuth = await createSession('user-student-bfs', tenantId, 'student');
  const otherTenantAuth = await createSession(otherAdminId, otherTenantId, 'school_admin');

  const studentEntityId = 'student-1'; // Hamza Rizwan, linked to user-parent-bfs via parent-1
  const otherStudentEntityId = 'student-3'; // Bilal Tariq, linked to parent-2
  const classId = 'class-9-matric';

  console.log('\n--- 1. Fee structures and fee heads can be created and updated ---');
  {
    // Create Fee Head
    const headCode = `LB${Date.now().toString().slice(-4)}`;
    const req = new Request('http://localhost/api/v1/fees/heads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        name: `Lab Fee ${headCode}`,
        code: headCode,
        isRecurring: true,
        defaultAmount: 1200
      })
    });
    const res = await handleCreateFeeHead(req, env);
    assert(res.status === 201, 'Accountant can create a new fee head (status 201)');
    const data = await getData(res);
    assert(data.defaultAmount === 1200, 'Fee head returns configured amount');

    // Set Fee Structure for class
    const structReq = new Request('http://localhost/api/v1/fees/structures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        classId,
        feeHeadId: data.id,
        amount: 1500,
        academicSession: '2026-2027'
      })
    });
    const structRes = await handleSetFeeStructure(structReq, env);
    assert(structRes.status === 200, 'Fee structure configured for class (status 200)');
  }

  console.log('\n--- 2. Invoices can be generated per student or batch ---');
  let createdInvoiceId = '';
  const testMonth = `Month-${Date.now()}`;
  {
    const req = new Request('http://localhost/api/v1/fees/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        studentId: studentEntityId,
        feeMonth: testMonth,
        issueDate: '2026-11-01',
        dueDate: '2026-11-15',
        tuitionFee: 6000,
        examFee: 500,
        otherCharges: 200,
        discount: 700
      })
    });
    const res = await handleCreateInvoice(req, env);
    assert(res.status === 201, 'Single student invoice generated (status 201)');
    const inv = await getData(res);
    assert(inv.totalAmount === 6000 + 500 + 200 - 700, 'Total amount calculates subtotal minus discount accurately (6000)');
    assert(inv.balance === 6000, 'Initial balance matches total amount');
    assert(inv.status === 'pending', 'Initial status is pending');
    createdInvoiceId = inv.id;

    // Batch generation test
    const batchMonth = `BatchMonth-${Date.now()}`;
    const batchReq = new Request('http://localhost/api/v1/fees/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        classId,
        feeMonth: batchMonth,
        issueDate: '2026-11-01',
        dueDate: '2026-11-15',
        examFee: 200
      })
    });
    const batchRes = await handleCreateInvoice(batchReq, env);
    assert(batchRes.status === 201, 'Batch class invoice generation executed successfully (status 201)');
    const batchData = await getData(batchRes);
    assert(batchData.generatedCount > 0, 'Multiple invoices generated for active class roster');
  }

  console.log('\n--- 3. Duplicate invoice prevention for the same student & period ---');
  {
    const dupReq = new Request('http://localhost/api/v1/fees/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        studentId: studentEntityId,
        feeMonth: testMonth,
        issueDate: '2026-11-01',
        dueDate: '2026-11-15',
        tuitionFee: 6000
      })
    });
    const dupRes = await handleCreateInvoice(dupReq, env);
    assert(dupRes.status === 409, 'Duplicate invoice creation for the same student and month rejected with 409 Conflict');
  }

  console.log('\n--- 4 & 5. Payment recording, partial payments & status updates ---');
  let payment1Id = '';
  {
    // Partial payment of 2000 out of 6000
    const payReq = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 2000,
        paymentDate: '2026-11-05',
        paymentMethod: 'cash',
        transactionRef: 'TRX-TEST-001',
        idempotencyKey: `idem-1-${Date.now()}`
      })
    });
    const payRes = await handleRecordPayment(payReq, env);
    assert(payRes.status === 201, 'Partial payment recorded (status 201)');
    const data = await getData(payRes);
    assert(data.invoice.amountPaid === 2000, 'Invoice amountPaid updated to 2000');
    assert(data.invoice.balance === 4000, 'Invoice balance updated to 4000');
    assert(data.invoice.status === 'partial', 'Invoice status updated to "partial"');
    payment1Id = data.payment.id;
  }

  console.log('\n--- 6. Payment reversals restore invoice balance without deleting history ---');
  {
    const revReq = new Request(`http://localhost/api/v1/fees/payments/${payment1Id}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        reason: 'Duplicate teller entry adjustment'
      })
    });
    const revRes = await handleReversePayment(payment1Id, revReq, env);
    assert(revRes.status === 200, 'Payment reversal accepted (status 200)');
    const revData = await getData(revRes);
    assert(revData.newInvoiceBalance === 6000, 'Invoice balance restored to 6000');

    // Check payment record still exists in DB but is_reversed = 1
    const payRow = sqlite.prepare(`SELECT is_reversed, reversal_id FROM fee_payments WHERE id = ?`).get(payment1Id) as any;
    assert(payRow && payRow.is_reversed === 1, 'Historical payment record preserved with is_reversed = 1 flag');

    // Check payment_reversals audit entry
    const revRow = sqlite.prepare(`SELECT * FROM payment_reversals WHERE payment_id = ?`).get(payment1Id) as any;
    assert(revRow && revRow.reason === 'Duplicate teller entry adjustment', 'Reversal audit record stored in payment_reversals table');
  }

  console.log('\n--- 7. Idempotency prevents duplicate payments ---');
  {
    const key = `idempotent-key-${Date.now()}`;
    const pReq1 = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 3000,
        paymentDate: '2026-11-06',
        paymentMethod: 'bank_transfer',
        transactionRef: 'BANK-001',
        idempotencyKey: key
      })
    });
    const pRes1 = await handleRecordPayment(pReq1, env);
    assert(pRes1.status === 201, 'Initial payment succeeded');

    // Second call with same idempotencyKey
    const pReq2 = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 3000,
        paymentDate: '2026-11-06',
        paymentMethod: 'bank_transfer',
        transactionRef: 'BANK-001',
        idempotencyKey: key
      })
    });
    const pRes2 = await handleRecordPayment(pReq2, env);
    assert(pRes2.status === 200, 'Subsequent payment with same idempotency key returned 200 without double-charging');
    const inv = sqlite.prepare(`SELECT amount_paid, balance FROM fee_invoices WHERE id = ?`).get(createdInvoiceId) as any;
    assert(inv.amount_paid === 3000, 'Invoice amount_paid charged once (3000) not doubled');
  }

  console.log('\n--- 8. Role permissions enforced (teacher denied, accountant authorized) ---');
  {
    // Teacher attempting to view fee invoices
    const teacherReq = new Request(`http://localhost/api/v1/fees/invoices?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: teacherAuth }
    });
    const teacherRes = await handleGetInvoices(teacherReq, env);
    assert(teacherRes.status === 403, 'Teacher access to fee invoices rejected with 403 Forbidden');

    // Teacher attempting to view fee structures
    const tStructReq = new Request(`http://localhost/api/v1/fees/structures?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: teacherAuth }
    });
    const tStructRes = await handleGetFeeStructures(tStructReq, env);
    assert(tStructRes.status === 403, 'Teacher access to fee structures rejected with 403 Forbidden');
  }

  console.log('\n--- 9. Parent and Student scoped visibility ---');
  {
    // Parent should see linked child's invoice
    const parentReq = new Request(`http://localhost/api/v1/fees/invoices?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: parentAuth }
    });
    const parentRes = await handleGetInvoices(parentReq, env);
    assert(parentRes.status === 200, 'Parent can fetch invoices for their child');
    const parentInvs = (await getData(parentRes)) as any[];
    assert(parentInvs.every(i => i.studentId === studentEntityId || i.studentId === 'student-2'), 'Parent only receives invoices of linked children');

    // Student should only see their own invoice
    const studentReq = new Request(`http://localhost/api/v1/fees/invoices?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: studentAuth }
    });
    const studentRes = await handleGetInvoices(studentReq, env);
    assert(studentRes.status === 200, 'Student can fetch invoices');
    const studentInvs = (await getData(studentRes)) as any[];
    assert(studentInvs.every(i => i.studentId === studentEntityId), 'Student only receives their own invoices');

    // Student cannot access other student ledger
    const badLedgerReq = new Request(`http://localhost/api/v1/fees/students/${otherStudentEntityId}/ledger?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: studentAuth }
    });
    const badLedgerRes = await handleGetStudentLedger(otherStudentEntityId, badLedgerReq, env);
    assert(badLedgerRes.status === 403, 'Student prevented from accessing another student fee ledger (403)');
  }

  console.log('\n--- 10. Cross-tenant reads and mutations rejected ---');
  {
    const crossReq = new Request(`http://localhost/api/v1/fees/invoices?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: otherTenantAuth }
    });
    const crossRes = await handleGetInvoices(crossReq, env);
    assert(crossRes.status === 403, 'Cross-tenant query rejected with 403 Forbidden');
  }

  console.log('\n--- 11. Financial summaries & audit reports calculate correctly ---');
  {
    const repReq = new Request(`http://localhost/api/v1/fees/reports/summary?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: accountantAuth }
    });
    const repRes = await handleGetFinancialSummary(repReq, env);
    assert(repRes.status === 200, 'Financial summary report fetched (status 200)');
    const rep = await getData(repRes);
    assert(rep.metrics && rep.metrics.totalBilled >= 6000, 'Total billed reflects registered invoices');
    assert(typeof rep.metrics.collectionRate === 'number', 'Collection rate percentage calculated');
    assert(Array.isArray(rep.paymentMethods), 'Payment methods breakdown provided');
    assert(Array.isArray(rep.classes), 'Class revenue breakdown provided');

    // Check financial audit trail
    const auditReq = new Request(`http://localhost/api/v1/fees/audit-logs?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: adminAuth }
    });
    const auditRes = await handleGetFeeAuditLogs(auditReq, env);
    assert(auditRes.status === 200, 'Financial audit logs retrieved (status 200)');
    const logs = (await getData(auditRes)) as any[];
    assert(logs.length > 0, 'Audit logs contains entries for created invoices, payments, and reversals');
    const actions = logs.map(l => l.action);
    assert(actions.includes('INVOICE_GENERATED') && actions.includes('PAYMENT_RECORDED') && actions.includes('PAYMENT_REVERSED'),
      'Audit log tracks INVOICE_GENERATED, PAYMENT_RECORDED, and PAYMENT_REVERSED actions');
  }

  console.log(`\n======================================================`);
  console.log(`Stage 6 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
