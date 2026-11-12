
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

async function login(email, password) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
        throw new Error(`Login failed for ${email}`);
    }

    return data.token;
}

async function runTests() {
    const adminToken = await login(
        process.env.ADMIN_EMAIL,
        process.env.ADMIN_PASSWORD
    );

    const memberToken = await login(
        'ananya@example.com',
        'Ananya123'
    );

    let passed = 0;

    async function test(name, url, expectedStatus, token = null) {
        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${BASE_URL}${url}`, { headers });
        const data = await response.json();

        console.log(`\n${name}`);
        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === expectedStatus) {
            console.log('PASS');
            passed++;
        } else {
            console.log('FAIL - Expected:', expectedStatus);
        }
    }

    console.log('\n========== RESERVATION SECURITY TESTS ==========');

    await test(
        'TEST 1: Unauthenticated access to all reservations',
        '/reservations',
        401
    );

    await test(
        'TEST 2: ADMIN retrieves all reservations',
        '/reservations',
        200,
        adminToken
    );

    await test(
        'TEST 3: MEMBER cannot retrieve all reservations',
        '/reservations',
        403,
        memberToken
    );

    await test(
        'TEST 4: ADMIN retrieves reservation ID 1',
        '/reservations/1',
        200,
        adminToken
    );

    await test(
        'TEST 5: MEMBER retrieves own reservation ID 1',
        '/reservations/1',
        200,
        memberToken
    );

    await test(
        'TEST 6: MEMBER cannot retrieve Rahul reservation ID 2',
        '/reservations/2',
        403,
        memberToken
    );

    await test(
        'TEST 7: Invalid reservation ID',
        '/reservations/abc',
        400,
        adminToken
    );

    await test(
        'TEST 8: Non-existent reservation ID',
        '/reservations/999999',
        404,
        adminToken
    );

    console.log('\n========== FINAL RESULT ==========');
    console.log(`Passed: ${passed}/8`);
    console.log(`Failed: ${8 - passed}/8`);

    if (passed !== 8) {
        process.exitCode = 1;
    }
}

runTests().catch(error => {
    console.error('Test execution failed:', error.message);
    process.exitCode = 1;
});
