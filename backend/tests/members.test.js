
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api/members';
const AUTH_URL = 'http://localhost:5000/api/auth/login';

let adminToken = '';
let memberToken = '';

async function login(email, password) {
    const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
        throw new Error('Login failed: ' + JSON.stringify(data));
    }

    return data.token;
}

async function runTests() {
    try {
        // Authenticate ADMIN and MEMBER
        console.log('\n========== AUTHENTICATION ==========');

        adminToken = await login(
            process.env.ADMIN_EMAIL,
            process.env.ADMIN_PASSWORD
        );

        memberToken = await login(
            'ananya@example.com',
            'Ananya123'
        );

        console.log('ADMIN authentication successful.');
        console.log('MEMBER authentication successful.');

        // TEST 1: Get all members as ADMIN
        console.log('\n========== TEST 1: GET ALL MEMBERS ==========');

        let response = await fetch(BASE_URL, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });

        let data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 200 && Array.isArray(data)) {
            console.log('PASS: All members retrieved successfully.');
        } else {
            console.log('FAIL: Unable to retrieve members.');
            return;
        }

        // TEST 2: Verify member details
        console.log('\n========== TEST 2: VERIFY MEMBER DETAILS ==========');

        const validMembers = data.every(member =>
            member.member_id !== undefined &&
            member.full_name !== undefined &&
            member.email !== undefined &&
            member.department !== undefined &&
            member.created_at !== undefined
        );

        if (validMembers) {
            console.log('PASS: All members contain required fields.');
        } else {
            console.log('FAIL: Some member fields are missing.');
        }

        // TEST 3: Verify member sorting
        console.log('\n========== TEST 3: VERIFY MEMBER SORTING ==========');

        let sorted = true;

        for (let i = 0; i < data.length - 1; i++) {
            if (data[i].member_id > data[i + 1].member_id) {
                sorted = false;
                break;
            }
        }

        if (sorted) {
            console.log('PASS: Members sorted by member ID.');
        } else {
            console.log('FAIL: Member sorting incorrect.');
        }

        // TEST 4: Get member by ID as ADMIN
        console.log('\n========== TEST 4: GET MEMBER BY ID ==========');

        if (data.length > 0) {
            const memberId = data[0].member_id;

            response = await fetch(`${BASE_URL}/${memberId}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            });

            const member = await response.json();

            console.log('Member ID:', memberId);
            console.log('HTTP Status:', response.status);
            console.log('Response:', member);

            if (
                response.status === 200 &&
                member.member_id === memberId
            ) {
                console.log('PASS: Specific member retrieved successfully.');
            } else {
                console.log('FAIL: Unable to retrieve member.');
            }
        } else {
            console.log('CHECK: No members available.');
        }

        // TEST 5: Invalid member ID
        console.log('\n========== TEST 5: INVALID MEMBER ID ==========');

        response = await fetch(`${BASE_URL}/99999`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 404) {
            console.log('PASS: Invalid member ID correctly rejected.');
        } else {
            console.log('FAIL: Invalid member ID not handled correctly.');
        }

        // TEST 6: Invalid ID format
        console.log('\n========== TEST 6: INVALID ID FORMAT ==========');

        response = await fetch(`${BASE_URL}/abc`, {
            headers: {
                Authorization: `Bearer ${adminToken}`
            }
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 400) {
            console.log('PASS: Invalid ID format handled.');
        } else {
            console.log('FAIL: Unexpected response for invalid ID.');
        }

        // TEST 7: MEMBER cannot retrieve all members
        console.log('\n========== TEST 7: MEMBER ACCESS RESTRICTION ==========');

        response = await fetch(BASE_URL, {
            headers: {
                Authorization: `Bearer ${memberToken}`
            }
        });

        console.log('HTTP Status:', response.status);

        if (response.status === 403) {
            console.log('PASS: MEMBER cannot retrieve all members.');
        } else {
            console.log('FAIL: MEMBER access restriction failed.');
        }

        // TEST 8: MEMBER can access own profile
        console.log('\n========== TEST 8: MEMBER ACCESS OWN PROFILE ==========');

        response = await fetch(`${BASE_URL}/1`, {
            headers: {
                Authorization: `Bearer ${memberToken}`
            }
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 200 && data.member_id === 1) {
            console.log('PASS: MEMBER can access own profile.');
        } else {
            console.log('FAIL: MEMBER cannot access own profile.');
        }

        // TEST 9: MEMBER cannot access another member's profile
        console.log('\n========== TEST 9: MEMBER ACCESS OTHER PROFILE ==========');

        response = await fetch(`${BASE_URL}/2`, {
            headers: {
                Authorization: `Bearer ${memberToken}`
            }
        });

        console.log('HTTP Status:', response.status);

        if (response.status === 403) {
            console.log('PASS: MEMBER cannot access another profile.');
        } else {
            console.log('FAIL: Other profile access restriction failed.');
        }

        // TEST 10: Unauthenticated access
        console.log('\n========== TEST 10: UNAUTHENTICATED ACCESS ==========');

        response = await fetch(BASE_URL);

        console.log('HTTP Status:', response.status);

        if (response.status === 401) {
            console.log('PASS: Unauthenticated access rejected.');
        } else {
            console.log('FAIL: Unauthenticated access was not rejected.');
        }

        console.log('\n========== ALL MEMBER TESTS EXECUTED ==========');

    } catch (error) {
        console.error('Test execution failed:', error.message);
    }
}

runTests();
