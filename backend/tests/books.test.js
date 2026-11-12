
const BASE_URL = 'http://localhost:5000/api/books';

async function runTests() {
  try {
    // ==========================================
    // TEST 1: GET ALL BOOKS
    // ==========================================

    console.log('\n========== TEST 1: GET ALL BOOKS ==========');

    const response1 = await fetch(BASE_URL);
    const books = await response1.json();

    console.log('HTTP Status:', response1.status);
    console.log('Total Books:', Array.isArray(books) ? books.length : 0);
    console.log('Response:', books);

    if (response1.status === 200 && Array.isArray(books)) {
      console.log('PASS: All books retrieved successfully.');
    } else {
      console.log('FAIL: Unable to retrieve books.');
      return;
    }

    // ==========================================
    // TEST 2: VERIFY BOOK DETAILS
    // ==========================================

    console.log('\n========== TEST 2: VERIFY BOOK DETAILS ==========');

    const requiredFields = [
      'book_id',
      'title',
      'author',
      'category',
      'language'
    ];

    const validBooks = books.every(book =>
      requiredFields.every(field =>
        book[field] !== undefined && book[field] !== null
      )
    );

    if (validBooks) {
      console.log('PASS: All books contain required fields.');
    } else {
      console.log('FAIL: Some book details are missing.');
    }

    // ==========================================
    // TEST 3: VERIFY BOOK SORTING
    // ==========================================

    console.log('\n========== TEST 3: VERIFY BOOK SORTING ==========');

    const sorted = books.every((book, index) =>
      index === 0 ||
      Number(books[index - 1].book_id) <= Number(book.book_id)
    );

    if (sorted) {
      console.log('PASS: Books are sorted by book ID.');
    } else {
      console.log('FAIL: Books are not sorted correctly.');
    }

    // ==========================================
    // TEST 4: GET BOOK BY ID
    // ==========================================

    console.log('\n========== TEST 4: GET BOOK BY ID ==========');

    if (books.length > 0) {
      const bookId = books[0].book_id;

      const response4 = await fetch(`${BASE_URL}/${bookId}`);
      const book = await response4.json();

      console.log('Book ID:', bookId);
      console.log('HTTP Status:', response4.status);
      console.log('Response:', book);

      if (
        response4.status === 200 &&
        Number(book.book_id) === Number(bookId)
      ) {
        console.log('PASS: Specific book retrieved successfully.');
      } else {
        console.log('FAIL: Unable to retrieve specific book.');
      }
    } else {
      console.log('SKIP: No books available for this test.');
    }

    // ==========================================
    // TEST 5: NON-EXISTENT BOOK ID
    // ==========================================

    console.log('\n========== TEST 5: NON-EXISTENT BOOK ID ==========');

    const response5 = await fetch(`${BASE_URL}/999999`);
    const result5 = await response5.json();

    console.log('HTTP Status:', response5.status);
    console.log('Response:', result5);

    if (response5.status === 404) {
      console.log('PASS: Non-existent book ID correctly rejected.');
    } else {
      console.log('FAIL: Non-existent book ID was not rejected.');
    }

    // ==========================================
    // TEST 6: INVALID ID FORMAT
    // ==========================================

    console.log('\n========== TEST 6: INVALID ID FORMAT ==========');

    const response6 = await fetch(`${BASE_URL}/abc`);
    const result6 = await response6.json();

    console.log('HTTP Status:', response6.status);
    console.log('Response:', result6);

    if (response6.status === 400) {
      console.log('PASS: Invalid ID format correctly rejected.');
    } else {
      console.log('FAIL: Unexpected response for invalid ID format.');
    }

    // ==========================================
    // TEST 7: PUBLIC BOOK ACCESS
    // ==========================================

    console.log('\n========== TEST 7: PUBLIC BOOK ACCESS ==========');

    const response7 = await fetch(BASE_URL);

    console.log('HTTP Status:', response7.status);

    if (response7.status === 200) {
      console.log('PASS: Books can be accessed without authentication.');
    } else {
      console.log('FAIL: Public book access failed.');
    }

    console.log('\n========== ALL BOOK TESTS EXECUTED ==========');

  } catch (error) {
    console.error('TEST EXECUTION ERROR:', error.message);
  }
}

runTests();
