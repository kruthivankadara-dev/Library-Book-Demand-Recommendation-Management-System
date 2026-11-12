
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('\n========== ADD BOOK TESTS ==========\n');

    try {
        // Login as ADMIN
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD
            })
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
            throw new Error('ADMIN login failed. Check your .env credentials.');
        }

        const token = loginData.token;
        console.log('ADMIN login: PASS');

        // Add a test book
        const bookResponse = await fetch(`${BASE_URL}/books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                isbn: '9780000000999',
                title: 'Test Book - Library System',
                author: 'Test Author',
                category: 'Programming',
                publisher: 'Test Publications',
                publication_year: 2024,
                description: 'Temporary test record for verifying book insertion.',
                language: 'English'
            })
        });

        const bookData = await bookResponse.json();

        console.log('HTTP Status:', bookResponse.status);
        console.log('Response:', bookData);

        if (bookResponse.status === 201) {
            console.log('\nPASS: Book added successfully.');
            console.log('New Book ID:', bookData.book_id);
        } else {
            console.log('\nFAIL: Book could not be added.');
        }

        // Verify the book appears in catalogue
        const catalogueResponse = await fetch(`${BASE_URL}/books`);
        const books = await catalogueResponse.json();

        const found = books.some(
            book => book.isbn === '9780000000999'
        );

        console.log(
            found
                ? 'PASS: New book appears in catalogue.'
                : 'FAIL: New book not found in catalogue.'
        );

    } catch (error) {
        console.error('TEST ERROR:', error.message);
    }

    console.log('\n========== TEST EXECUTION COMPLETE ==========\n');
}

runTests();
