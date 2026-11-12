
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api/ratings';
const AUTH_URL = 'http://localhost:5000/api/auth/login';

let adminToken = '';
let memberToken = '';
let allRatings = [];

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

function authHeaders(token) {
    return {
        'Authorization': `Bearer ${token}`
    };
}

async function runTests() {
    try {
        // AUTHENTICATION
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

        // TEST 1: Get all ratings
        console.log('\n========== TEST 1: GET ALL RATINGS ==========');

        let response = await fetch(BASE_URL, {
            headers: authHeaders(adminToken)
        });

        let data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 200 && Array.isArray(data)) {
            allRatings = data;
            console.log('PASS: All ratings retrieved successfully.');
        } else {
            console.log('FAIL: Unable to retrieve ratings.');
            return;
        }

        // TEST 2: Verify rating details
        console.log('\n========== TEST 2: VERIFY RATING DETAILS ==========');

        const validRatings = allRatings.every(rating =>
            rating.rating_id !== undefined &&
            rating.full_name !== undefined &&
            rating.title !== undefined &&
            rating.rating !== undefined &&
            rating.review_text !== undefined
        );

        if (validRatings) {
            console.log('PASS: All ratings contain required fields.');
        } else {
            console.log('FAIL: Some rating fields are missing.');
        }

        // TEST 3: Verify descending sorting
        console.log('\n========== TEST 3: VERIFY RATING SORTING ==========');

        let sorted = true;

        for (let i = 0; i < allRatings.length - 1; i++) {
            if (allRatings[i].rating < allRatings[i + 1].rating) {
                sorted = false;
                break;
            }
        }

        if (sorted) {
            console.log('PASS: Ratings are sorted in descending order.');
        } else {
            console.log('FAIL: Ratings are not sorted correctly.');
        }

        // TEST 4: Get rating by ID
        console.log('\n========== TEST 4: GET RATING BY ID ==========');

        if (allRatings.length > 0) {
            const ratingId = allRatings[0].rating_id;

            response = await fetch(`${BASE_URL}/${ratingId}`, {
                headers: authHeaders(adminToken)
            });

            const rating = await response.json();

            console.log('Rating ID:', ratingId);
            console.log('HTTP Status:', response.status);
            console.log('Response:', rating);

            if (
                response.status === 200 &&
                rating.rating_id === ratingId
            ) {
                console.log('PASS: Specific rating retrieved successfully.');
            } else {
                console.log('FAIL: Unable to retrieve specific rating.');
            }
        } else {
            console.log('CHECK: No ratings available for this test.');
        }

        // TEST 5: Invalid rating ID
        console.log('\n========== TEST 5: INVALID RATING ID ==========');

        response = await fetch(`${BASE_URL}/99999`, {
            headers: authHeaders(adminToken)
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 404) {
            console.log('PASS: Invalid rating ID correctly rejected.');
        } else {
            console.log('FAIL: Invalid rating ID was not handled correctly.');
        }

        // TEST 6: Invalid ID format
        console.log('\n========== TEST 6: INVALID ID FORMAT ==========');

        response = await fetch(`${BASE_URL}/abc`, {
            headers: authHeaders(adminToken)
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 400) {
            console.log('PASS: Invalid ID format handled.');
        } else {
            console.log('FAIL: Unexpected response for invalid ID format.');
        }

        // TEST 7: MEMBER cannot retrieve all ratings
        console.log('\n========== TEST 7: MEMBER ACCESS RESTRICTION ==========');

        response = await fetch(BASE_URL, {
            headers: authHeaders(memberToken)
        });

        console.log('HTTP Status:', response.status);

        if (response.status === 403) {
            console.log('PASS: MEMBER cannot retrieve all ratings.');
        } else {
            console.log('FAIL: MEMBER access restriction failed.');
        }

        // TEST 8: MEMBER accesses own rating
        console.log('\n========== TEST 8: MEMBER ACCESS OWN RATING ==========');

        const ownRating = allRatings.find(
            rating => rating.full_name === 'Ananya Sharma'
        );

        if (ownRating) {
            response = await fetch(`${BASE_URL}/${ownRating.rating_id}`, {
                headers: authHeaders(memberToken)
            });

            const rating = await response.json();

            console.log('HTTP Status:', response.status);
            console.log('Response:', rating);

            if (
                response.status === 200 &&
                Number(rating.member_id) === 1
            ) {
                console.log('PASS: MEMBER can access own rating.');
            } else {
                console.log('FAIL: MEMBER cannot access own rating.');
            }
        } else {
            console.log('FAIL: No rating found for Ananya Sharma.');
        }

        // TEST 9: MEMBER cannot access another member's rating
        console.log('\n========== TEST 9: MEMBER ACCESS OTHER RATING ==========');

        const otherRating = allRatings.find(
            rating => rating.full_name !== 'Ananya Sharma'
        );

        if (otherRating) {
            response = await fetch(`${BASE_URL}/${otherRating.rating_id}`, {
                headers: authHeaders(memberToken)
            });

            data = await response.json();

            console.log('HTTP Status:', response.status);
            console.log('Response:', data);

            if (response.status === 403) {
                console.log('PASS: MEMBER cannot access another member rating.');
            } else {
                console.log('FAIL: Other member rating access was not restricted.');
            }
        } else {
            console.log('FAIL: No other member rating available.');
        }

        // TEST 10: Unauthenticated access
        console.log('\n========== TEST 10: UNAUTHENTICATED ACCESS ==========');

        response = await fetch(BASE_URL);

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 401) {
            console.log('PASS: Unauthenticated access rejected.');
        } else {
            console.log('FAIL: Unauthenticated access was not rejected.');
        }

        console.log('\n========== ALL RATING TESTS EXECUTED ==========');

    } catch (error) {
        console.error('Test execution failed:', error.message);
    }
}

runTests();
