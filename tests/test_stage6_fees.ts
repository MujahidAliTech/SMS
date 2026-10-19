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
          const flatValues = values.map(v => (v === undefined ? null : v)) as any[];
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
              return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
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
          return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
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
  const principalAuth = await createSession('user-principal-bfs', tenantId, 'principal');
  const teacherAuth = await createSession('user-teacher-bfs', tenantId, 'teacher');
  const parentAuth = await createSession('user-parent-bfs', tenantId, 'parent');
  const studentAuth = await createSession('user-student-bfs', tenantId, 'student');
  const otherTenantAuth = await createSession(otherAdminId, otherTenantId, 'school_admin');

  // Parent 2 user (Tariq Mehmood, linked to student-3 Bilal Tariq)
  const otherParentUserId = 'user-parent2-bfs';
  sqlite.prepare(`
    INSERT OR REPLACE INTO users (id, tenant_id, name, email, phone, role, is_active, linked_entity_id, created_at)
    VALUES (?, ?, 'Tariq Mehmood', 'tariq.parent@test.pk', '03001234567', 'parent', 1, 'parent-2', datetime('now'))
  `).run(otherParentUserId, tenantId);
  const otherParentAuth = await createSession(otherParentUserId, tenantId, 'parent');

  // Student 2 user (Bilal Tariq, student-3)
  const otherStudentUserId = 'user-student3-bfs';
  sqlite.prepare(`
    INSERT OR REPLACE INTO users (id, tenant_id, name, email, phone, role, is_active, linked_entity_id, created_at)
    VALUES (?, ?, 'Bilal Tariq', 'bilal.tariq@student.pk', '03007654321', 'student', 1, 'student-3', datetime('now'))
  `).run(otherStudentUserId, tenantId);
  const otherStudentAuth = await createSession(otherStudentUserId, tenantId, 'student');

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
    // Short reason rejected
    const shortReq = new Request(`http://localhost/api/v1/fees/payments/${payment1Id}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({ tenantId, reason: 'bad' })
    });
    const shortRes = await handleReversePayment(payment1Id, shortReq, env);
    assert(shortRes.status === 400, 'Payment reversal with short reason rejected (status 400)');

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

    // Duplicate reversal attempt must be rejected with 409 Conflict
    const dupRevReq = new Request(`http://localhost/api/v1/fees/payments/${payment1Id}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({ tenantId, reason: 'Attempting to reverse already reversed payment' })
    });
    const dupRevRes = await handleReversePayment(payment1Id, dupRevReq, env);
    assert(dupRevRes.status === 409, 'Duplicate reversal of the same payment rejected with 409 Conflict');
  }

  console.log('\n--- 7. Idempotency prevents duplicate payments & payload tampering ---');
  {
    // Test missing idempotencyKey
    const noKeyReq = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 3000,
        paymentDate: '2026-11-06',
        paymentMethod: 'bank_transfer'
      })
    });
    const noKeyRes = await handleRecordPayment(noKeyReq, env);
    assert(noKeyRes.status === 400, 'Payment without idempotencyKey rejected with 400 Bad Request');

    // Test malformed idempotencyKey (< 8 chars)
    const shortKeyReq = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 3000,
        paymentDate: '2026-11-06',
        paymentMethod: 'bank_transfer',
        idempotencyKey: 'short'
      })
    });
    const shortKeyRes = await handleRecordPayment(shortKeyReq, env);
    assert(shortKeyRes.status === 400, 'Payment with short idempotencyKey (<8 chars) rejected with 400 Bad Request');

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
    assert(pRes1.status === 201, 'Initial payment with valid idempotencyKey succeeded (201)');

    // Second call with same idempotencyKey and SAME payload
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
    assert(pRes2.status === 200, 'Subsequent payment with same idempotency key and payload returned 200 without double-charging');
    const inv = sqlite.prepare(`SELECT amount_paid, balance FROM fee_invoices WHERE id = ?`).get(createdInvoiceId) as any;
    assert(inv.amount_paid === 3000, 'Invoice amount_paid charged once (3000) not doubled');

    // Third call with SAME idempotencyKey but DIFFERENT amount (payload mismatch)
    const pReqDiffAmount = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 2500, // Different amount!
        paymentDate: '2026-11-06',
        paymentMethod: 'bank_transfer',
        transactionRef: 'BANK-001',
        idempotencyKey: key
      })
    });
    const pResDiffAmount = await handleRecordPayment(pReqDiffAmount, env);
    assert(pResDiffAmount.status === 409, 'Reusing same idempotencyKey with different amount rejected with 409 Conflict');

    // Concurrent duplicate submission test
    const concurrentKey = `concurrent-key-${Date.now()}`;
    const makeConcurrentReq = () => new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 1000,
        paymentDate: '2026-11-07',
        paymentMethod: 'cash',
        idempotencyKey: concurrentKey
      })
    });

    const [cRes1, cRes2] = await Promise.all([
      handleRecordPayment(makeConcurrentReq(), env),
      handleRecordPayment(makeConcurrentReq(), env)
    ]);
    const statuses = [cRes1.status, cRes2.status].sort();
    assert(statuses[0] === 200 && statuses[1] === 201, 'Concurrent duplicate submissions safely handled (one 201, one 200 idempotent)');
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

  console.log('\n--- 12. Receipt authorization & multi-role verification ---');
  {
    // Record a verified payment for studentEntityId (Hamza Rizwan)
    const receiptTestKey = `rcpt-key-${Date.now()}`;
    const rcptPayReq = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 500,
        paymentDate: '2026-11-08',
        paymentMethod: 'cash',
        idempotencyKey: receiptTestKey
      })
    });
    const rcptPayRes = await handleRecordPayment(rcptPayReq, env);
    const rcptPayData = await getData(rcptPayRes);
    const targetPaymentId = rcptPayData.payment.id;

    // 1. Linked parent can view their child's receipt
    const linkedParentReq = new Request(`http://localhost/api/v1/fees/payments/${targetPaymentId}/receipt?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: parentAuth }
    });
    const linkedParentRes = await handleGetReceipt(targetPaymentId, linkedParentReq, env);
    assert(linkedParentRes.status === 200, 'Linked parent can access their child\'s payment receipt (200)');

    // 2. Unlinked parent (Tariq Mehmood, parent of Bilal Tariq) CANNOT view Hamza's receipt
    const unlinkedParentReq = new Request(`http://localhost/api/v1/fees/payments/${targetPaymentId}/receipt?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: otherParentAuth }
    });
    const unlinkedParentRes = await handleGetReceipt(targetPaymentId, unlinkedParentReq, env);
    assert(unlinkedParentRes.status === 403, 'Unlinked parent access to another child\'s receipt rejected with 403 Forbidden');

    // 3. Student can view their own receipt
    const ownStudentReq = new Request(`http://localhost/api/v1/fees/payments/${targetPaymentId}/receipt?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: studentAuth }
    });
    const ownStudentRes = await handleGetReceipt(targetPaymentId, ownStudentReq, env);
    assert(ownStudentRes.status === 200, 'Student can view their own payment receipt (200)');

    // 3b. Student CANNOT view another student's payment receipt
    const otherStudentReq = new Request(`http://localhost/api/v1/fees/payments/${targetPaymentId}/receipt?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: otherStudentAuth }
    });
    const otherStudentRes = await handleGetReceipt(targetPaymentId, otherStudentReq, env);
    assert(otherStudentRes.status === 403, 'Student access to another student\'s receipt rejected with 403 Forbidden');

    // 4. Teacher CANNOT view payment receipts
    const teacherReceiptReq = new Request(`http://localhost/api/v1/fees/payments/${targetPaymentId}/receipt?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: teacherAuth }
    });
    const teacherReceiptRes = await handleGetReceipt(targetPaymentId, teacherReceiptReq, env);
    assert(teacherReceiptRes.status === 403, 'Teacher access to payment receipts rejected with 403 Forbidden');

    // 5. Cross-tenant user requesting payment receipt rejected
    const crossTenantReceiptReq = new Request(`http://localhost/api/v1/fees/payments/${targetPaymentId}/receipt?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { Authorization: otherTenantAuth }
    });
    const crossTenantReceiptRes = await handleGetReceipt(targetPaymentId, crossTenantReceiptReq, env);
    assert(crossTenantReceiptRes.status === 403, 'Cross-tenant user requesting payment receipt rejected with 403 Forbidden');

    const crossTenantDirectReq = new Request(`http://localhost/api/v1/fees/payments/${targetPaymentId}/receipt`, {
      method: 'GET',
      headers: { Authorization: otherTenantAuth }
    });
    const crossTenantDirectRes = await handleGetReceipt(targetPaymentId, crossTenantDirectReq, env);
    assert(crossTenantDirectRes.status === 404, 'Cross-tenant direct URL query rejected with 404 Not Found');
  }

  console.log('\n--- 13. Financial calculation integrity: zero, negative & overpayments ---');
  {
    // Zero payment rejected
    const zeroReq = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 0,
        paymentDate: '2026-11-08',
        paymentMethod: 'cash',
        idempotencyKey: `zero-key-${Date.now()}`
      })
    });
    const zeroRes = await handleRecordPayment(zeroReq, env);
    assert(zeroRes.status === 400, 'Zero amount payment rejected with 400 Bad Request');

    // Negative payment rejected
    const negReq = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: -500,
        paymentDate: '2026-11-08',
        paymentMethod: 'cash',
        idempotencyKey: `neg-key-${Date.now()}`
      })
    });
    const negRes = await handleRecordPayment(negReq, env);
    assert(negRes.status === 400, 'Negative amount payment rejected with 400 Bad Request');

    // Overpayment rejected (attempting to pay 999,999 when balance is < 5000)
    const overReq = new Request('http://localhost/api/v1/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        invoiceId: createdInvoiceId,
        amount: 999999,
        paymentDate: '2026-11-08',
        paymentMethod: 'cash',
        idempotencyKey: `over-key-${Date.now()}`
      })
    });
    const overRes = await handleRecordPayment(overReq, env);
    assert(overRes.status === 400, 'Overpayment exceeding invoice balance rejected with 400 Bad Request');
  }

  console.log('\n--- 14. Least-privilege role enforcement for fee concessions ---');
  {
    // 1. Accountant CANNOT apply fee concessions (requires admin or principal)
    const accConcReq = new Request(`http://localhost/api/v1/fees/invoices/${createdInvoiceId}/concession`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: accountantAuth },
      body: JSON.stringify({
        tenantId,
        discount: 300,
        concessionType: 'sibling_discount',
        reason: 'Accountant unauthorized concession attempt'
      })
    });
    const accConcRes = await handleApplyConcession(createdInvoiceId, accConcReq, env);
    assert(accConcRes.status === 403, 'Accountant denied from applying fee concessions (403 Forbidden)');

    // 2. Principal CAN approve fee concessions
    const prinConcReq = new Request(`http://localhost/api/v1/fees/invoices/${createdInvoiceId}/concession`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: principalAuth },
      body: JSON.stringify({
        tenantId,
        discount: 300,
        concessionType: 'merit_scholarship',
        reason: 'Approved merit scholarship by Principal'
      })
    });
    const prinConcRes = await handleApplyConcession(createdInvoiceId, prinConcReq, env);
    assert(prinConcRes.status === 200, 'Principal authorized to apply fee concession (200 OK)');
    const concData = await getData(prinConcRes);
    assert(concData.discount === 300, 'Concession discount applied accurately to invoice');

    // 3. Discount exceeding subtotal rejected
    const excessiveConcReq = new Request(`http://localhost/api/v1/fees/invoices/${createdInvoiceId}/concession`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: adminAuth },
      body: JSON.stringify({
        tenantId,
        discount: 9999999,
        reason: 'Excessive discount test'
      })
    });
    const excessiveConcRes = await handleApplyConcession(createdInvoiceId, excessiveConcReq, env);
    assert(excessiveConcRes.status === 400, 'Concession discount exceeding invoice subtotal rejected with 400 Bad Request');
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
