
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api/loans';
const AUTH_URL = 'http://localhost:5000/api/auth/login';

let adminToken = '';

async function loginAsAdmin() {
    console.log('\n========== ADMIN LOGIN ==========');

    const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        })
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
        throw new Error('ADMIN login failed: ' + JSON.stringify(data));
    }

    adminToken = data.token;
    console.log('ADMIN authentication successful.');
}

async function runTest(name, loanId, expectedStatus) {
    console.log(`\n========== ${name} ==========`);

    try {
        const response = await fetch(
            `${BASE_URL}/${loanId}/return`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                }
            }
        );

        const data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === expectedStatus) {
            console.log('PASS:', name);
        } else {
            console.log('FAIL:', name);
        }

        return data;

    } catch (error) {
        console.error('Test error:', error.message);
    }
}

async function runAllTests() {
    try {
        await loginAsAdmin();

        // TEST 1: Successfully return an active loan (Loan ID 10)
        await runTest(
            'TEST 1: SUCCESSFUL BOOK RETURN',
            10,
            200
        );

        // TEST 2: Attempt to return the same book again
        await runTest(
            'TEST 2: ALREADY RETURNED BOOK',
            10,
            409
        );

        // TEST 3: Non-existent loan ID
        await runTest(
            'TEST 3: INVALID LOAN ID',
            99999,
            404
        );

        // TEST 4: Invalid loan ID format
        await runTest(
            'TEST 4: INVALID INPUT',
            'abc',
            400
        );

        console.log('\n========== ALL RETURN TESTS EXECUTED ==========');

    } catch (error) {
        console.error('Test execution failed:', error.message);
    }
}

runAllTests();
