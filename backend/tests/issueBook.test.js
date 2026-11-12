
const BASE_URL = "http://localhost:5000";

let adminToken = "";

async function loginAsAdmin() {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: "admin@library.com",
            password: "12345678"
        })
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
        throw new Error("ADMIN login failed. Cannot execute tests.");
    }

    adminToken = data.token;
    console.log("ADMIN authentication successful.");
}

async function runTest(name, testFunction) {
    console.log(`\n========== ${name} ==========`);

    try {
        await testFunction();
    } catch (error) {
        console.error("TEST ERROR:", error.message);
    }
}

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
    };
}

async function testIssueBook() {
    const response = await fetch(`${BASE_URL}/api/loans`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            member_id: 1,
            book_id: 3
        })
    });

    const data = await response.json();

    console.log("HTTP Status:", response.status);
    console.log("Response:", data);

    if (response.status === 201) {
        console.log("PASS: Book issued successfully.");
        console.log("Loan ID:", data.loan.loan_id);
        console.log("Analytics logged:", data.analytics_logged);
    } else if (response.status === 409) {
        console.log("PASS: Duplicate active loan prevented.");
    } else {
        console.log("FAIL: Unexpected response.");
    }
}

async function testInvalidMember() {
    const response = await fetch(`${BASE_URL}/api/loans`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            member_id: 9999,
            book_id: 3
        })
    });

    const data = await response.json();

    console.log("HTTP Status:", response.status);
    console.log("Response:", data);

    console.log(
        response.status === 404
            ? "PASS: Invalid member rejected."
            : "FAIL: Unexpected response."
    );
}

async function testInvalidBook() {
    const response = await fetch(`${BASE_URL}/api/loans`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            member_id: 1,
            book_id: 9999
        })
    });

    const data = await response.json();

    console.log("HTTP Status:", response.status);
    console.log("Response:", data);

    console.log(
        response.status === 404
            ? "PASS: Invalid book rejected."
            : "FAIL: Unexpected response."
    );
}

async function testInvalidInput() {
    const response = await fetch(`${BASE_URL}/api/loans`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            member_id: -1,
            book_id: 3
        })
    });

    const data = await response.json();

    console.log("HTTP Status:", response.status);
    console.log("Response:", data);

    console.log(
        response.status === 400
            ? "PASS: Invalid input rejected."
            : "FAIL: Unexpected response."
    );
}

async function main() {
    try {
        await loginAsAdmin();

        await runTest("TEST 1: ISSUE BOOK", testIssueBook);
        await runTest("TEST 2: INVALID MEMBER", testInvalidMember);
        await runTest("TEST 3: INVALID BOOK", testInvalidBook);
        await runTest("TEST 4: INVALID INPUT", testInvalidInput);

        console.log("\n========== ALL TESTS EXECUTED ==========\n");
    } catch (error) {
        console.error("TEST SETUP FAILED:", error.message);
    }
}

main();
