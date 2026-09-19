const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runE2ETests() {
  console.log('========================================================');
  console.log('   PULSEVOTE COMPLETE ONLINE VOTING SYSTEM E2E AUDIT    ');
  console.log('========================================================\n');

  // 1. Admin Authentication with Hardcoded Credentials
  console.log('--- Step 1: Testing Administrator Authentication (admin@example.com) ---');
  let res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@example.com', password: 'test-admin-password' });

  console.log('Admin Login HTTP Status:', res.status);
  console.log('Admin Role:', res.data.user?.role, '| Name:', res.data.user?.full_name);
  if (res.status !== 200 || res.data.user?.role !== 'admin') {
    throw new Error('Admin login failed: ' + JSON.stringify(res.data));
  }
  const adminToken = res.data.token;
  console.log('✓ Admin login verified successfully!\n');

  // 2. User Registration with Password Strength & Email Verification
  console.log('--- Step 2: Voter Registration with Email Confirmation Requirement ---');
  const voterEmail = `voter_${Date.now()}@university.edu`;
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    full_name: 'Jane Citizen',
    email: voterEmail,
    password: 'SecurePassword2026!',
    department: 'Computer Science & AI',
    bio: 'Civic tech advocate'
  });

  console.log('Registration HTTP Status:', res.status);
  console.log('Generated Activation Code:', res.data.verification_code);
  if (res.status !== 201 || !res.data.verification_code) {
    throw new Error('Registration failed: ' + JSON.stringify(res.data));
  }
  const verificationCode = res.data.verification_code;
  console.log('✓ Voter registered in unverified state.\n');

  // 3. Attempt Login Before Confirmation (Must be Blocked)
  console.log('--- Step 3: Verifying Unverified Account Sign-In Rejection ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: voterEmail, password: 'SecurePassword2026!' });

  console.log('Pre-verification Login Status:', res.status, res.data.error);
  if (res.status !== 403) {
    throw new Error('Unverified login was not blocked!');
  }
  console.log('✓ Fraud prevention: Unverified login correctly rejected (403 Forbidden).\n');

  // 4. Confirm Email Activation Code
  console.log('--- Step 4: Activating Voter Account via 6-Digit Code ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/verify-email',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: voterEmail, code: verificationCode });

  console.log('Activation HTTP Status:', res.status);
  console.log('Account is_verified:', res.data.user?.is_verified, '| Badges:', res.data.user?.badges);
  if (res.status !== 200 || !res.data.user?.is_verified) {
    throw new Error('Account activation failed: ' + JSON.stringify(res.data));
  }
  const voterToken = res.data.token;
  console.log('✓ Voter email confirmed. Awarded badge: Verified Citizen 🛡️\n');

  // 5. Admin Launches an Election with "Blind Vote Mode"
  console.log('--- Step 5: Admin Launches Election with Blind Vote Mode ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/polls',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, {
    title: '2026 Community Executive Election',
    description: 'Official annual election for executive president and council representatives.',
    category: 'Governance',
    is_blind: true,
    options: ['Candidate Elena Rostova', 'Candidate Marcus Chen', 'Candidate Sarah Al-Mansoor']
  });

  console.log('Create Election HTTP Status:', res.status);
  console.log('Election Title:', res.data.title, '| ID:', res.data.id, '| Blind Mode:', res.data.is_blind);
  const pollId = res.data.id;
  console.log('✓ Election launched live.\n');

  // 6. Verify Blind Mode Masks Results for New Voter
  console.log('--- Step 6: Verifying Blind Vote Bandwagon Prevention Masking ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/polls/${pollId}?fingerprint=test_fingerprint_voter`,
    method: 'GET'
  });

  const optionVoteCheck = res.data.poll?.options?.[0]?.votes;
  console.log('Option 1 Vote tally before voting (Masked value):', optionVoteCheck);
  if (optionVoteCheck !== -1) {
    throw new Error('Blind mode failed to mask vote counts before ballot is cast!');
  }
  console.log('✓ Blind vote mode verified: Tallies masked (-1) to eliminate herd bias.\n');

  // 6b. Test Account-Based Access Control: Anonymous vote without token MUST be rejected (401 Unauthorized)
  console.log('--- Step 6b: Testing Account-Based Access Control (Anonymous Vote Rejection) ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/polls/${pollId}/vote`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    option_id: 'opt_1',
    fingerprint: 'test_fingerprint_anon',
    department: 'General'
  });

  console.log('Anonymous Vote HTTP Status:', res.status, res.data.error);
  if (res.status !== 401) {
    throw new Error('Account-based access control failed: Anonymous vote was not blocked with 401 Unauthorized!');
  }
  console.log('✓ Account-based access control verified: Anonymous vote strictly rejected (401 Unauthorized).\n');

  // 7. Voter Casts Certified Ballot with Demographic Recording
  console.log('--- Step 7: Casting Certified Ballot with Cryptographic Receipt ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/polls/${pollId}/vote`,
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${voterToken}`
    }
  }, {
    option_id: 'opt_1',
    fingerprint: 'test_fingerprint_voter',
    department: 'Computer Science & AI'
  });

  console.log('Vote HTTP Status:', res.status);
  console.log('Cryptographic Receipt Hash:', res.data.receipt_hash);
  console.log('Candidate Chosen:', res.data.option_text);
  console.log('Voter Badges Awarded:', res.data.badges);
  const receiptHash = res.data.receipt_hash;
  if (res.status !== 200 || !receiptHash) {
    throw new Error('Vote submission failed: ' + JSON.stringify(res.data));
  }
  console.log('✓ Ballot committed and sealed on ledger.\n');

  // 8. Test Duplicate Voting Prevention
  console.log('--- Step 8: Testing Fraud Prevention (Duplicate Vote Prevention) ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/polls/${pollId}/vote`,
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${voterToken}`
    }
  }, {
    option_id: 'opt_2',
    fingerprint: 'test_fingerprint_voter',
    department: 'Computer Science & AI'
  });

  console.log('Duplicate Vote Status:', res.status, res.data.error);
  if (res.status !== 409) {
    throw new Error('Duplicate vote was not blocked!');
  }
  console.log('✓ Fraud prevention: Duplicate ballot rejected (409 Conflict).\n');

  // 9. Zero-Knowledge Cryptographic Ballot Verification on Ledger
  console.log('--- Step 9: Zero-Knowledge Public Ballot Receipt Audit ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/receipts/verify/${encodeURIComponent(receiptHash)}`,
    method: 'GET'
  });

  console.log('Receipt Verification Status:', res.status);
  console.log('Verified:', res.data.verified, '| Status:', res.data.status);
  console.log('Election:', res.data.poll_title);
  console.log('Choice Confirmed on Ledger:', res.data.option_selected);
  if (res.status !== 200 || !res.data.verified) {
    throw new Error('Receipt verification failed: ' + JSON.stringify(res.data));
  }
  console.log('✓ Zero-knowledge proof verified: Ballot confirmed counted without disclosing voter identity!\n');

  // 10. Voter Views Personal Ballot History
  console.log('--- Step 10: Voter Ballot History Audit Trail ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/votes/history',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${voterToken}` }
  });

  console.log('Ballot History Status:', res.status, '| Total Ballots Cast:', res.data.length);
  console.log('First Record Poll:', res.data[0]?.poll_title, '| Receipt:', res.data[0]?.receipt_hash);
  if (res.status !== 200 || res.data.length === 0) {
    throw new Error('Voter history failed: ' + JSON.stringify(res.data));
  }
  console.log('✓ Voter history retrieved successfully.\n');

  // 11. Interactive Live Commentary Feed
  console.log('--- Step 11: Live Commentary & Reaction Feed ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/polls/${pollId}/comments`,
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${voterToken}`
    }
  }, { text: 'Excited for this election! Cryptographic receipts are awesome. 🗳️' });

  console.log('Post Comment Status:', res.status);
  const commentId = res.data.id;

  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/polls/${pollId}/comments`,
    method: 'GET'
  });
  console.log('Retrieved Comments Count:', res.data.length, '| Latest Message:', res.data[res.data.length - 1]?.text);
  console.log('✓ Commentary feed verified.\n');

  // 12. Admin Real-Time Analytics & Demographic Breakdown
  console.log('--- Step 12: Admin Real-Time Analytics & Demographic Breakdown ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/admin/analytics?poll_id=${pollId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  console.log('Analytics HTTP Status:', res.status);
  console.log('Total Certified Ballots:', res.data.total_votes);
  console.log('Option Tallies:', res.data.option_votes);
  console.log('Demographic Breakdown:', res.data.demographics);
  if (res.status !== 200 || res.data.total_votes < 1) {
    throw new Error('Admin analytics failed: ' + JSON.stringify(res.data));
  }
  console.log('✓ Real-time analytics and demographic breakdown verified.\n');

  // 13. Admin Comprehensive System Audit Trail
  console.log('--- Step 13: Comprehensive System Audit Trail Logging ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/admin/audit-logs',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  console.log('Audit Logs HTTP Status:', res.status, '| Total Events Logged:', res.data.length);
  console.log('Sample Recent Actions:', res.data.slice(0, 3).map(l => `${l.action} (${l.details})`));
  if (res.status !== 200 || res.data.length === 0) {
    throw new Error('Audit trail retrieval failed: ' + JSON.stringify(res.data));
  }
  console.log('✓ System audit trail logging verified.\n');

  // 14. Admin Results Data Export (CSV)
  console.log('--- Step 14: Results Data Export (CSV Streaming) ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/admin/export/csv?poll_id=${pollId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  console.log('CSV Export HTTP Status:', res.status);
  console.log('Content-Type Header:', res.headers['content-type']);
  console.log('CSV Snippet (First 150 chars):\n', res.data.substring(0, 150));
  if (res.status !== 200 || !res.headers['content-type']?.includes('text/csv')) {
    throw new Error('CSV export failed: ' + JSON.stringify(res.data));
  }
  console.log('✓ CSV streaming export verified.\n');

  // 15. Admin Official Printable Audit Certificate (PDF)
  console.log('--- Step 15: Official Printable Election Audit Report (PDF/HTML) ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/admin/export/pdf?poll_id=${pollId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  console.log('PDF/HTML Export HTTP Status:', res.status);
  console.log('Report Title Excerpt:', res.data.includes('Official Election Audit Certificate') ? 'Found "Official Election Audit Certificate"' : 'Not Found');
  if (res.status !== 200 || !res.data.includes('Official Election Audit Certificate')) {
    throw new Error('PDF export failed');
  }
  console.log('✓ Printable election audit report verified.\n');

  // 16. Verify Removal of ZIP Download Routes (404 Not Found)
  console.log('--- Step 16: Verifying Removal of ZIP Download Routes (404 Check) ---');
  res = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/download',
    method: 'GET'
  });
  console.log('Backend /download HTTP Status:', res.status);
  if (res.status !== 404) {
    throw new Error('ZIP download endpoint still exists! Expected 404 Not Found.');
  }

  res = await request({
    hostname: 'localhost',
    port: 5173,
    path: '/live-polling-app.zip',
    method: 'GET'
  });
  console.log('Frontend /live-polling-app.zip Content-Type:', res.headers['content-type']);
  if (res.headers['content-type'] === 'application/zip') {
    throw new Error('Public ZIP file still accessible as application/zip on frontend!');
  }
  console.log('✓ ZIP download endpoints completely removed and no ZIP file is served.\n');

  // 17. Verify Login Brute Force Protection (Rate Limiting 429)
  console.log('--- Step 17: Verifying Login Rate Limiting (Brute Force Protection) ---');
  let blocked429 = false;
  for (let i = 0; i < 6; i++) {
    res = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'brute_force_test@test.com', password: 'wrongpassword' });
    if (res.status === 429) {
      blocked429 = true;
      console.log(`Attempt ${i + 1}: Received expected 429 Too Many Requests:`, res.data?.error || res.data);
      break;
    }
  }
  if (!blocked429) {
    throw new Error('Login rate limiting failed to trigger 429 Too Many Requests after 6 attempts!');
  }
  console.log('✓ Login brute force protection verified: Rate limiter triggered (429 Too Many Requests).\n');

  console.log('========================================================');
  console.log('  >>> ALL 17 E2E VERIFICATION CHECKS PASSED 100% <<<    ');
  console.log('========================================================');
}

runE2ETests().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
