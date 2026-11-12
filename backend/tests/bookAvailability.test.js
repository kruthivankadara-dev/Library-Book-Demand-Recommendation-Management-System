
const API = "http://localhost:5000/api";

async function testBookAvailability() {
    try {
        const response = await fetch(`${API}/books`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const books = await response.json();

        console.log("\n========== BOOK AVAILABILITY ==========\n");

        books.forEach((book) => {
            console.log(`Book: ${book.title}`);
            console.log(`Total Copies: ${book.total_copies}`);
            console.log(`Borrowed Copies: ${book.borrowed_copies}`);
            console.log(`Available Copies: ${book.available_copies}`);
            console.log(`Status: ${book.availability_status}`);
            console.log("---------------------------------------");
        });

        console.log(`\nTotal Books Checked: ${books.length}`);

        console.log("\nAvailability API test completed.");

    } catch (error) {
        console.error("TEST FAILED:", error.message);
        process.exitCode = 1;
    }
}

testBookAvailability();
