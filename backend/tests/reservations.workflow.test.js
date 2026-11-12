
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

const BOOK_ID = 11;
const ANANYA_ID = 1;
const RAHUL_ID = 2;
const PRIYA_ID = 3;

let adminToken;
let ananyaToken;
let rahulToken;
let priyaToken;

let ananyaLoanId;
let rahulReservationId;
let priyaReservationId;

let passed = 0;
let failed = 0;

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

async function request(method, url, token, body = null) {
    const options = {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${url}`, options);

    const text = await response.text();

    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { raw: text };
    }

    return {
        status: response.status,
        data
    };
}

function check(name, condition, details = '') {
    console.log(`\n${name}`);

    if (condition) {
        console.log('PASS');
        passed++;
    } else {
        console.log('FAIL', details);
        failed++;
    }
}

async function runTests() {
    console.log('\n========== RESERVATION WORKFLOW TESTS ==========');

    // Login using existing test accounts.
    adminToken = await login(
        process.env.ADMIN_EMAIL,
        process.env.ADMIN_PASSWORD
    );

    ananyaToken = await login(
        'ananya@example.com',
        'Ananya123'
    );

    rahulToken = await login(
        'rahul@example.com',
        'Rahul123'
    );

    priyaToken = await login(
        'priya@example.com',
        'Priya123'
    );

    // TEST 1: Reservation rejected when copy is available.
    let result = await request(
        'POST',
        '/reservations',
        ananyaToken,
        { book_id: BOOK_ID }
    );

    check(
        'TEST 1: Cannot reserve an available book',
        result.status === 409,
        JSON.stringify(result.data)
    );

    // TEST 2: Issue the only copy to Ananya.
    result = await request(
        'POST',
        '/loans',
        adminToken,
        {
            member_id: ANANYA_ID,
            book_id: BOOK_ID
        }
    );

    check(
        'TEST 2: Issue test book to Ananya',
        result.status === 201,
        JSON.stringify(result.data)
    );

    ananyaLoanId = result.data.loan?.loan_id;

    // Stop if the prerequisite issue failed.
    if (!ananyaLoanId) {
        throw new Error(
            'Cannot continue: Ananya loan was not created.'
        );
    }

    // TEST 3: Rahul creates first reservation.
    result = await request(
        'POST',
        '/reservations',
        rahulToken,
        { book_id: BOOK_ID }
    );

    check(
        'TEST 3: Rahul creates first reservation',
        result.status === 201 &&
        result.data.reservation?.queue_position === 1,
        JSON.stringify(result.data)
    );

    rahulReservationId =
        result.data.reservation?.reservation_id;

    if (!rahulReservationId) {
        throw new Error(
            'Cannot continue: Rahul reservation was not created.'
        );
    }

    // TEST 4: Priya creates second reservation.
    result = await request(
        'POST',
        '/reservations',
        priyaToken,
        { book_id: BOOK_ID }
    );

    check(
        'TEST 4: Priya enters second in FIFO queue',
        result.status === 201 &&
        result.data.reservation?.queue_position === 2,
        JSON.stringify(result.data)
    );

    priyaReservationId =
        result.data.reservation?.reservation_id;

    if (!priyaReservationId) {
        throw new Error(
            'Cannot continue: Priya reservation was not created.'
        );
    }

    // TEST 5: Duplicate reservation prevention.
    result = await request(
        'POST',
        '/reservations',
        rahulToken,
        { book_id: BOOK_ID }
    );

    check(
        'TEST 5: Duplicate active reservation rejected',
        result.status === 409,
        JSON.stringify(result.data)
    );

    // TEST 6: Cancel Rahul's reservation.
    result = await request(
        'PUT',
        `/reservations/${rahulReservationId}/cancel`,
        rahulToken
    );

    check(
        'TEST 6: Rahul cancels his reservation',
        result.status === 200,
        JSON.stringify(result.data)
    );

    // TEST 7: Verify Priya moves to position 1.
    result = await request(
        'GET',
        `/reservations/${priyaReservationId}`,
        adminToken
    );

    check(
        'TEST 7: Priya becomes first in FIFO queue',
        result.status === 200 &&
        Number(result.data.queue_position) === 1,
        JSON.stringify(result.data)
    );

    // TEST 8: Return Ananya's book.
    result = await request(
        'PUT',
        `/loans/${ananyaLoanId}/return`,
        adminToken
    );

    check(
        'TEST 8: Ananya returns the book',
        result.status === 200 &&
        result.data.loan?.status === 'Returned',
        JSON.stringify(result.data)
    );

    // TEST 9: Returning does not fulfil reservation.
    result = await request(
        'GET',
        `/reservations/${priyaReservationId}`,
        adminToken
    );

    check(
        'TEST 9: Priya reservation remains Active after return',
        result.status === 200 &&
        result.data.status === 'Active',
        JSON.stringify(result.data)
    );

    // TEST 10: Wrong member cannot bypass FIFO.
    result = await request(
        'POST',
        '/loans',
        adminToken,
        {
            member_id: RAHUL_ID,
            book_id: BOOK_ID
        }
    );

    check(
        'TEST 10: Non-queue member cannot issue reserved book',
        result.status === 409,
        JSON.stringify(result.data)
    );

    // TEST 11: Issue the available book to Priya.
    result = await request(
        'POST',
        '/loans',
        adminToken,
        {
            member_id: PRIYA_ID,
            book_id: BOOK_ID
        }
    );

    check(
        'TEST 11: FIFO member Priya receives the book',
        result.status === 201,
        JSON.stringify(result.data)
    );

    // TEST 12: Verify reservation fulfilment.
    result = await request(
        'GET',
        `/reservations/${priyaReservationId}`,
        adminToken
    );

    check(
        'TEST 12: Priya reservation becomes Fulfilled',
        result.status === 200 &&
        result.data.status === 'Fulfilled',
        JSON.stringify(result.data)
    );

    console.log('\n========== FINAL WORKFLOW RESULT ==========');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runTests().catch(error => {
    console.error('\nTEST EXECUTION ERROR:', error.message);
    process.exitCode = 1;
});
