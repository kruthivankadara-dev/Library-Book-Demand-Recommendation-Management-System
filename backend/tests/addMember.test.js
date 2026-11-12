
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('\n========== ADD MEMBER TESTS ==========\n');

    try {
        // 1. Login as ADMIN
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD
            })
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
            throw new Error('ADMIN login failed.');
        }

        const token = loginData.token;

        console.log('ADMIN login: PASS');

        // 2. Add a new member
        const memberResponse = await fetch(`${BASE_URL}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                full_name: 'Test Member',
                email: 'testmember@example.com',
                department: 'Computer Science'
            })
        });

        const memberData = await memberResponse.json();

        console.log('Add Member HTTP Status:', memberResponse.status);
        console.log('Response:', memberData);

        if (memberResponse.status === 201) {
            console.log('\nPASS: Member added successfully.');
            console.log('New Member ID:', memberData.member_id);
        } else if (memberResponse.status === 409) {
            console.log('\nMember already exists. Duplicate protection works.');
        } else {
            throw new Error(memberData.message || 'Member creation failed.');
        }

        // 3. Verify member appears in the member list
        const listResponse = await fetch(`${BASE_URL}/members`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const members = await listResponse.json();

        const found = members.some(
            member => member.email === 'testmember@example.com'
        );

        if (found) {
            console.log('PASS: New member appears in member list.');
        } else {
            throw new Error('New member was not found in member list.');
        }

        console.log('\n========== TEST EXECUTION COMPLETE ==========');

    } catch (error) {
        console.error('\nTEST FAILED:', error.message);
    }
}

runTests();
