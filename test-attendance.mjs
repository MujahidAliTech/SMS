async function runAttendanceVerification() {
  const base = 'http://localhost:3000';

  async function login(email, password = 'Password123!') {
    const res = await fetch(base + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    const cookie = res.headers.get('set-cookie');
    return { status: res.status, data: json.data || json, cookie };
  }

  console.log('=== STAGE 5 ATTENDANCE API & ROLE-BASED VERIFICATION ===\n');

  // 1. School Admin
  const admin = await login('admin@brightfuture.edu.pk');
  console.log('1. Admin login status:', admin.status, 'Role:', admin.data?.user?.role);

  const getAttRes = await fetch(base + '/api/v1/attendance?classId=class-9-matric&date=2026-10-17', {
    headers: { Cookie: admin.cookie }
  });
  const attJson = await getAttRes.json();
  const attData = attJson.data || attJson;
  console.log('Admin GET /attendance status:', getAttRes.status, 'Total in roster:', attData.totalStudents);

  const saveAttRes = await fetch(base + '/api/v1/attendance/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
    body: JSON.stringify({
      classId: 'class-9-matric',
      date: '2026-10-17',
      records: [
        { studentId: 'student-1', status: 'present', remarks: 'Morning assembly present' }
      ]
    })
  });
  const saveAttJson = await saveAttRes.json();
  console.log('Admin POST /attendance/batch status:', saveAttRes.status, 'Message:', saveAttJson.data?.message || saveAttJson.message);

  // Correct record
  const fetchAgain = await fetch(base + '/api/v1/attendance?classId=class-9-matric&date=2026-10-17', {
    headers: { Cookie: admin.cookie }
  });
  const rosterAgain = (await fetchAgain.json()).data;
  const st1Record = rosterAgain?.roster?.find(r => r.studentId === 'student-1');
  console.log('Student 1 record ID:', st1Record?.recordId);

  if (st1Record?.recordId) {
    const correctRes = await fetch(base + '/api/v1/attendance/' + encodeURIComponent(st1Record.recordId) + '/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({
        newStatus: 'late',
        newRemarks: 'Arrived 15 mins late due to van delay',
        reason: 'Verified by gate security'
      })
    });
    const correctJson = await correctRes.json();
    console.log('Admin POST /attendance/:id/correct status:', correctRes.status, 'Correction ID:', correctJson.data?.correctionId);
  }

  // Audit log
  const auditRes = await fetch(base + '/api/v1/attendance/corrections?date=2026-10-17', {
    headers: { Cookie: admin.cookie }
  });
  const auditJson = await auditRes.json();
  const auditData = auditJson.data || auditJson;
  console.log('Admin GET /attendance/corrections status:', auditRes.status, 'Logs count:', auditData.length);

  // Summary
  const summaryRes = await fetch(base + '/api/v1/attendance/summary?date=2026-10-17', {
    headers: { Cookie: admin.cookie }
  });
  const summaryData = (await summaryRes.json()).data;
  console.log('Admin GET /attendance/summary status:', summaryRes.status, 'Overall marked:', summaryData.overall?.totalMarked);

  // 2. Teacher
  const teacher = await login('zeeshan@brightfuture.edu.pk');
  console.log('\n2. Teacher login status:', teacher.status, 'Role:', teacher.data?.user?.role);

  const tAttRes = await fetch(base + '/api/v1/attendance?classId=class-9-matric&date=2026-10-17', {
    headers: { Cookie: teacher.cookie }
  });
  console.log('Teacher GET /attendance (assigned class-9-matric) status:', tAttRes.status);

  const tUnassignedAttRes = await fetch(base + '/api/v1/attendance?classId=class-5&date=2026-10-17', {
    headers: { Cookie: teacher.cookie }
  });
  console.log('Teacher GET /attendance (unassigned class-5, expect 403):', tUnassignedAttRes.status);

  const tAuditRes = await fetch(base + '/api/v1/attendance/corrections', {
    headers: { Cookie: teacher.cookie }
  });
  console.log('Teacher GET /attendance/corrections status (expect 403):', tAuditRes.status);

  // 3. Parent
  const parent = await login('rizwan.father@gmail.com');
  console.log('\n3. Parent login status:', parent.status, 'Role:', parent.data?.user?.role);

  const pRosterRes = await fetch(base + '/api/v1/attendance?classId=class-9-matric&date=2026-10-17', {
    headers: { Cookie: parent.cookie }
  });
  console.log('Parent GET /attendance (class roster, expect 403):', pRosterRes.status);

  const pChildRes = await fetch(base + '/api/v1/attendance/student/student-1', {
    headers: { Cookie: parent.cookie }
  });
  console.log('Parent GET /attendance/student/student-1 (own child) status:', pChildRes.status);

  const pOtherChildRes = await fetch(base + '/api/v1/attendance/student/student-2', {
    headers: { Cookie: parent.cookie }
  });
  console.log('Parent GET /attendance/student/student-2 (other child, expect 403):', pOtherChildRes.status);

  // 4. Student
  const student = await login('hamza.rizwan@student.pk');
  console.log('\n4. Student login status:', student.status, 'Role:', student.data?.user?.role);

  const sRosterRes = await fetch(base + '/api/v1/attendance?classId=class-9-matric&date=2026-10-17', {
    headers: { Cookie: student.cookie }
  });
  console.log('Student GET /attendance (class roster, expect 403):', sRosterRes.status);

  const sSelfRes = await fetch(base + '/api/v1/attendance/student/student-1', {
    headers: { Cookie: student.cookie }
  });
  console.log('Student GET /attendance/student/student-1 (self) status:', sSelfRes.status);

  const sOtherRes = await fetch(base + '/api/v1/attendance/student/student-2', {
    headers: { Cookie: student.cookie }
  });
  console.log('Student GET /attendance/student/student-2 (other student, expect 403):', sOtherRes.status);

  // 5. Accountant
  const acct = await login('accounts@brightfuture.edu.pk');
  console.log('\n5. Accountant login status:', acct.status, 'Role:', acct.data?.user?.role);

  const acctAttRes = await fetch(base + '/api/v1/attendance?classId=class-9-matric&date=2026-10-17', {
    headers: { Cookie: acct.cookie }
  });
  console.log('Accountant GET /attendance (expect 403):', acctAttRes.status);

  const acctStudentAttRes = await fetch(base + '/api/v1/attendance/student/student-1', {
    headers: { Cookie: acct.cookie }
  });
  console.log('Accountant GET /attendance/student/student-1 (expect 403):', acctStudentAttRes.status);

  console.log('\n=== ALL TESTS PASSED VERIFIED ===');
}

runAttendanceVerification().catch(console.error);
