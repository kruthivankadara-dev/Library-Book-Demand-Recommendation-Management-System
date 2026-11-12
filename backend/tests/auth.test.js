
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;

async function request(path, method = 'GET', body = null, token = null) {
    const headers = {};

    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    return { status: response.status, data };
}

async function test(name, expectedStatus, callback) {
    try {
        const result = await callback();

        console.log(`\n${name}`);
        console.log('HTTP Status:', result.status);

        if (result.status === expectedStatus) {
            console.log('PASS');
            passed++;
        } else {
            console.log('FAIL - Expected:', expectedStatus);
            console.log('Response:', result.data);
            failed++;
        }

        return result;
    } catch (error) {
        console.log(`\n${name}`);
        console.log('FAIL:', error.message);
        failed++;
        return null;
    }
}

async function runTests() {
    console.log('\n========== AUTHENTICATION TESTS ==========');

    // 1. Missing registration fields
    await test('TEST 1: Registration with missing fields', 400, () =>
        request('/auth/register', 'POST', {})
    );

    // 2. Invalid email
    await test('TEST 2: Registration with invalid email', 400, () =>
        request('/auth/register', 'POST', {
            full_name: 'Rahul Verma',
            email: 'invalid-email',
            password: 'Rahul12345'
        })
    );

    // 3. Short password
    await test('TEST 3: Registration with short password', 400, () =>
        request('/auth/register', 'POST', {
            full_name: 'Rahul Verma',
            email: 'rahul@example.com',
            password: '123'
        })
    );

    // 4. Unknown library member
    await test('TEST 4: Registration with unknown member email', 404, () =>
        request('/auth/register', 'POST', {
            full_name: 'Unknown User',
            email: 'unknown@example.com',
            password: 'Unknown123'
        })
    );

    // 5. Register Rahul (member ID 2)
    await test('TEST 5: Valid MEMBER registration', 201, () =>
        request('/auth/register', 'POST', {
            full_name: 'Rahul Verma',
            email: 'rahul@example.com',
            password: 'Rahul12345'
        })
    );

    // 6. Duplicate registration
    await test('TEST 6: Duplicate registration', 409, () =>
        request('/auth/register', 'POST', {
            full_name: 'Rahul Verma',
            email: 'rahul@example.com',
            password: 'Rahul12345'
        })
    );

    // 7. Admin login
    const adminLogin = await test(
        'TEST 7: ADMIN login',
        200,
        () => request('/auth/login', 'POST', {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        })
    );

    const adminToken = adminLogin?.data?.token;

    if (!adminToken) {
        throw new Error('ADMIN login failed. Cannot continue token tests.');
    }

    // 8. Missing login fields
    await test('TEST 8: Login with missing credentials', 400, () =>
        request('/auth/login', 'POST', {})
    );

    // 9. Incorrect password
    await test('TEST 9: Login with incorrect password', 401, () =>
        request('/auth/login', 'POST', {
            email: process.env.ADMIN_EMAIL,
            password: 'WrongPassword123'
        })
    );

    // 10. Admin profile
    await test('TEST 10: ADMIN accesses /me', 200, () =>
        request('/auth/me', 'GET', null, adminToken)
    );

    // 11. Missing token
    await test('TEST 11: Access /me without token', 401, () =>
        request('/auth/me')
    );

    // 12. Invalid token
    await test('TEST 12: Access /me with invalid token', 403, () =>
        request('/auth/me', 'GET', null, 'invalid.token.value')
    );

    // 13. Admin-only route
    await test('TEST 13: ADMIN accesses admin-test', 200, () =>
        request('/auth/admin-test', 'GET', null, adminToken)
    );

    // 14. Admin cannot access member-only route
    await test('TEST 14: ADMIN denied member-test', 403, () =>
        request('/auth/member-test', 'GET', null, adminToken)
    );

    // 15. Rahul login
    const memberLogin = await test(
        'TEST 15: MEMBER login',
        200,
        () => request('/auth/login', 'POST', {
            email: 'rahul@example.com',
            password: 'Rahul12345'
        })
    );

    const memberToken = memberLogin?.data?.token;

    if (memberToken) {
        // 16. Member profile
        await test('TEST 16: MEMBER accesses /me', 200, () =>
            request('/auth/me', 'GET', null, memberToken)
        );

        // 17. Member-only route
        await test('TEST 17: MEMBER accesses member-test', 200, () =>
            request('/auth/member-test', 'GET', null, memberToken)
        );

        // 18. Member cannot access admin route
        await test('TEST 18: MEMBER denied admin-test', 403, () =>
            request('/auth/admin-test', 'GET', null, memberToken)
        );
    }

    console.log('\n========== FINAL AUTHENTICATION RESULT ==========');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runTests().catch(error => {
    console.error('Authentication test execution failed:', error.message);
    process.exitCode = 1;
});
