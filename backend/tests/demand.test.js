
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

async function login() {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        })
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
        throw new Error('ADMIN login failed.');
    }

    return data.token;
}

async function makeRequest(endpoint, token = null) {
    const headers = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${BASE_URL}/demand${endpoint}`,
        { headers }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    return {
        status: response.status,
        data
    };
}

async function runTests() {
    let passed = 0;
    let failed = 0;

    function check(name, condition) {
        console.log(`\n${name}`);

        if (condition) {
            console.log('PASS');
            passed++;
        } else {
            console.log('FAIL');
            failed++;
        }
    }

    try {
        const token = await login();

        console.log('\n========== DEMAND MODULE TESTS ==========');

        // TEST 1: Unauthenticated access
        const unauthenticated = await makeRequest('');

        console.log('\nTEST 1: Unauthenticated demand access');
        console.log('HTTP Status:', unauthenticated.status);

        check('Unauthenticated access correctly rejected',
            unauthenticated.status === 401);

        // TEST 2: Get all demand records
        const result = await makeRequest('', token);

        console.log('\nTEST 2: GET ALL BOOK DEMAND');
        console.log('HTTP Status:', result.status);
        console.log('Total Records:',
            Array.isArray(result.data) ? result.data.length : 0);

        check('All demand records retrieved successfully',
            result.status === 200 && Array.isArray(result.data));

        // TEST 3: Verify required fields
        const validRecords = Array.isArray(result.data) &&
            result.data.every(record =>
                record.demand_id !== undefined &&
                record.book_id !== undefined &&
                record.title !== undefined &&
                record.author !== undefined &&
                record.category !== undefined &&
                record.request_count !== undefined &&
                record.loan_count !== undefined
            );

        check('All demand records contain required fields',
            validRecords);

        // TEST 4: Verify descending sorting
        const sorted = Array.isArray(result.data) &&
            result.data.every((record, index, array) =>
                index === 0 ||
                Number(array[index - 1].request_count) >=
                Number(record.request_count)
            );

        check('Demand records are sorted by request count descending',
            sorted);

        // TEST 5: Get specific demand record
        console.log('\nTEST 5: GET DEMAND BY ID');

        let specificPassed = false;

        if (result.data.length > 0) {
            const demandId = result.data[0].demand_id;
            const specific = await makeRequest(`/${demandId}`, token);

            console.log('Demand ID:', demandId);
            console.log('HTTP Status:', specific.status);
            console.log('Response:', specific.data);

            specificPassed =
                specific.status === 200 &&
                specific.data.demand_id === demandId;
        }

        check('Specific demand record retrieved successfully',
            specificPassed);

        // TEST 6: Non-existent demand ID
        const missing = await makeRequest('/999999', token);

        console.log('\nTEST 6: NON-EXISTENT DEMAND ID');
        console.log('HTTP Status:', missing.status);
        console.log('Response:', missing.data);

        check('Non-existent demand ID returns 404',
            missing.status === 404);

        // TEST 7: Invalid ID format
        const invalid = await makeRequest('/abc', token);

        console.log('\nTEST 7: INVALID DEMAND ID FORMAT');
        console.log('HTTP Status:', invalid.status);
        console.log('Response:', invalid.data);

        check('Invalid demand ID format returns 400',
            invalid.status === 400);

        // TEST 8: MEMBER access
        const memberLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'ananya@example.com',
                password: 'Ananya123'
            })
        });

        const memberData = await memberLogin.json();

        let memberPassed = false;

        if (memberLogin.ok && memberData.token) {
            const memberResult = await makeRequest('', memberData.token);
            memberPassed =
                memberResult.status === 200 &&
                Array.isArray(memberResult.data);
        }

        console.log('\nTEST 8: MEMBER ACCESS TO DEMAND');
        check('Authenticated MEMBER can view demand records',
            memberPassed);

    } catch (error) {
        console.error('\nTEST EXECUTION ERROR:', error.message);
        failed++;
    }

    console.log('\n========== FINAL DEMAND TEST RESULTS ==========');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runTests();
