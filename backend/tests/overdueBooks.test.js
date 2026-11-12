
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';
const AUTH_URL = `${BASE_URL}/api/auth/login`;

let adminToken = '';

// ADMIN authentication
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

// Helper function to call the API
async function makeRequest(endpoint) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });

    const data = await response.json();

    return {
        status: response.status,
        data
    };
}

async function runTests() {
    try {
        await loginAsAdmin();

        console.log('\n========== TEST 1: GET OVERDUE BOOKS ==========');

        // TEST 1: Retrieve overdue books
        const result = await makeRequest('/api/loans/overdue');

        console.log('HTTP Status:', result.status);
        console.log('Response:', result.data);

        if (result.status === 200) {
            console.log('PASS: Overdue books retrieved successfully.');
        } else {
            console.log('FAIL: Could not retrieve overdue books.');
            return;
        }

        // TEST 2: Verify overdue count
        console.log('\n========== TEST 2: VERIFY OVERDUE COUNT ==========');

        const overdueCount = result.data.total_overdue;

        console.log('Total overdue books:', overdueCount);

        if (
            overdueCount === result.data.overdue_loans.length
        ) {
            console.log('PASS: Overdue count matches retrieved records.');
        } else {
            console.log('FAIL: Overdue count does not match.');
        }

        // TEST 3: Verify overdue status
        console.log('\n========== TEST 3: VERIFY OVERDUE STATUS ==========');

        const allOverdue = result.data.overdue_loans.every(
            loan => loan.status === 'Overdue'
        );

        if (allOverdue) {
            console.log('PASS: All retrieved loans have Overdue status.');
        } else {
            console.log('FAIL: Some loans have an incorrect status.');
        }

        // TEST 4: Verify days overdue
        console.log('\n========== TEST 4: VERIFY DAYS OVERDUE ==========');

        const validDays = result.data.overdue_loans.every(
            loan => Number.isInteger(loan.days_overdue) &&
                    loan.days_overdue > 0
        );

        if (validDays) {
            console.log('PASS: Days overdue calculated correctly.');
        } else {
            console.log('FAIL: Invalid days overdue values found.');
        }

        // TEST 5: Verify newly marked overdue count
        console.log('\n========== TEST 5: VERIFY NEWLY MARKED OVERDUE ==========');

        console.log(
            'Newly marked overdue:',
            result.data.newly_marked_overdue
        );

        if (
            Number.isInteger(result.data.newly_marked_overdue) &&
            result.data.newly_marked_overdue >= 0
        ) {
            console.log('PASS: Newly marked overdue count is valid.');
        } else {
            console.log('FAIL: Invalid newly marked overdue count.');
        }

        // TEST 6: Verify MongoDB analytics logging
        console.log('\n========== TEST 6: VERIFY ANALYTICS LOGGING ==========');

        console.log(
            'Analytics logged:',
            result.data.analytics_logged
        );

        if (
            Number.isInteger(result.data.analytics_logged) &&
            result.data.analytics_logged >= 0
        ) {
            console.log('PASS: Analytics logging count is valid.');
        } else {
            console.log('FAIL: Invalid analytics logging count.');
        }

        // TEST 7: Check repeated API call
        console.log('\n========== TEST 7: REPEATED API CALL ==========');

        const secondResult = await makeRequest('/api/loans/overdue');

        if (
            secondResult.status === 200 &&
            secondResult.data.total_overdue === overdueCount &&
            secondResult.data.overdue_loans.every(
                loan => loan.status === 'Overdue'
            )
        ) {
            console.log('PASS: Repeated API call returned consistent overdue records.');
            console.log(
                'Newly marked overdue on second call:',
                secondResult.data.newly_marked_overdue
            );
            console.log(
                'Analytics logged on second call:',
                secondResult.data.analytics_logged
            );
        } else {
            console.log('FAIL: Repeated API call returned unexpected results.');
        }

    } catch (error) {
        console.error('TEST EXECUTION ERROR:', error.message);
    }

    console.log('\n========== ALL OVERDUE TESTS EXECUTED ==========\n');
}

runTests();
