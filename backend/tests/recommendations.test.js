
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';
const RECOMMENDATIONS_URL = `${BASE_URL}/api/recommendations`;
const AUTH_URL = `${BASE_URL}/api/auth/login`;

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

function authHeaders(token) {
    return {
        'Authorization': `Bearer ${token}`
    };
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

        // TEST 1: Recommendations for valid member
        console.log('\n========== TEST 1: VALID MEMBER RECOMMENDATIONS ==========');

        let response = await fetch(`${RECOMMENDATIONS_URL}/1`, {
            headers: authHeaders(adminToken)
        });

        let data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (
            response.status === 200 &&
            data.member_id === 1 &&
            data.recommendation_method === 'Hybrid' &&
            Array.isArray(data.recommendations)
        ) {
            console.log('PASS: Hybrid recommendations generated.');
        } else {
            console.log('FAIL: Recommendation generation failed.');
            return;
        }

        // TEST 2: Verify recommendation structure
        console.log('\n========== TEST 2: VERIFY RECOMMENDATION DETAILS ==========');

        const validStructure = data.recommendations.every(book =>
            book.book_id !== undefined &&
            book.title !== undefined &&
            book.author !== undefined &&
            book.category !== undefined &&
            typeof book.average_rating === 'number' &&
            typeof book.loan_count === 'number' &&
            typeof book.request_count === 'number' &&
            typeof book.score === 'number' &&
            Array.isArray(book.reasons)
        );

        if (validStructure) {
            console.log('PASS: All recommendation fields are present.');
        } else {
            console.log('FAIL: Recommendation fields are missing.');
        }

        // TEST 3: Verify descending recommendation scores
        console.log('\n========== TEST 3: VERIFY RECOMMENDATION SORTING ==========');

        let sorted = true;

        for (let i = 0; i < data.recommendations.length - 1; i++) {
            if (
                data.recommendations[i].score <
                data.recommendations[i + 1].score
            ) {
                sorted = false;
                break;
            }
        }

        if (sorted) {
            console.log('PASS: Recommendations sorted by score.');
        } else {
            console.log('FAIL: Recommendation sorting incorrect.');
        }

        // TEST 4: Verify already-rated books are excluded
        console.log('\n========== TEST 4: VERIFY ALREADY-RATED BOOKS ==========');

        const ratingsResponse = await fetch(
            `${BASE_URL}/api/ratings`,
            {
                headers: authHeaders(adminToken)
            }
        );

        const ratings = await ratingsResponse.json();

        if (!ratingsResponse.ok || !Array.isArray(ratings)) {
            throw new Error(
                'Could not retrieve ratings: ' + JSON.stringify(ratings)
            );
        }

        const ratedBookIds = ratings
            .filter(r => r.full_name === 'Ananya Sharma')
            .map(r => r.title);

        const recommendedTitles = data.recommendations.map(
            book => book.title
        );

        const excludedRatedBooks = ratedBookIds.every(
            title => !recommendedTitles.includes(title)
        );

        if (excludedRatedBooks) {
            console.log('PASS: Already-rated books are excluded.');
        } else {
            console.log('FAIL: An already-rated book was recommended.');
        }

        // TEST 5: Invalid member ID
        console.log('\n========== TEST 5: INVALID MEMBER ID ==========');

        response = await fetch(`${RECOMMENDATIONS_URL}/99999`, {
            headers: authHeaders(adminToken)
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 404) {
            console.log('PASS: Invalid member correctly rejected.');
        } else {
            console.log('FAIL: Invalid member was not rejected.');
        }

        // TEST 6: Invalid member ID format
        console.log('\n========== TEST 6: INVALID MEMBER ID FORMAT ==========');

        response = await fetch(`${RECOMMENDATIONS_URL}/abc`, {
            headers: authHeaders(adminToken)
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 400) {
            console.log('PASS: Invalid member ID format rejected.');
        } else {
            console.log('FAIL: Invalid ID format not handled correctly.');
        }

        // TEST 7: Verify another member as ADMIN
        console.log('\n========== TEST 7: RECOMMENDATIONS FOR MEMBER 2 ==========');

        response = await fetch(`${RECOMMENDATIONS_URL}/2`, {
            headers: authHeaders(adminToken)
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Recommendation Count:', data.count);

        if (
            response.status === 200 &&
            data.member_id === 2 &&
            Array.isArray(data.recommendations)
        ) {
            console.log('PASS: Recommendations generated for member 2.');
        } else {
            console.log('FAIL: Member 2 recommendations failed.');
        }

        // TEST 8: MEMBER can access own recommendations
        console.log('\n========== TEST 8: MEMBER ACCESS OWN RECOMMENDATIONS ==========');

        response = await fetch(`${RECOMMENDATIONS_URL}/1`, {
            headers: authHeaders(memberToken)
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);

        if (
            response.status === 200 &&
            data.member_id === 1 &&
            Array.isArray(data.recommendations)
        ) {
            console.log('PASS: MEMBER can access own recommendations.');
        } else {
            console.log('FAIL: MEMBER cannot access own recommendations.');
        }

        // TEST 9: MEMBER cannot access another member's recommendations
        console.log('\n========== TEST 9: MEMBER ACCESS OTHER RECOMMENDATIONS ==========');

        response = await fetch(`${RECOMMENDATIONS_URL}/2`, {
            headers: authHeaders(memberToken)
        });

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 403) {
            console.log('PASS: MEMBER cannot access another member recommendations.');
        } else {
            console.log('FAIL: Other member recommendations were not restricted.');
        }

        // TEST 10: Unauthenticated access
        console.log('\n========== TEST 10: UNAUTHENTICATED ACCESS ==========');

        response = await fetch(`${RECOMMENDATIONS_URL}/1`);

        data = await response.json();

        console.log('HTTP Status:', response.status);
        console.log('Response:', data);

        if (response.status === 401) {
            console.log('PASS: Unauthenticated access rejected.');
        } else {
            console.log('FAIL: Unauthenticated access was not rejected.');
        }

        console.log('\n========== ALL RECOMMENDATION TESTS EXECUTED ==========');

    } catch (error) {
        console.error('Test execution failed:', error.message);
    }
}

runTests();
