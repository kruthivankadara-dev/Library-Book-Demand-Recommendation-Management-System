
const express = require('express');
const router = express.Router();
const db = require('../db');

const {
    authenticateToken,
    authorizeRoles
} = require('../middleware/authMiddleware');

// GET ALL BOOKS - Public access
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
    SELECT
        b.*,
        COALESCE(l.borrowed_copies, 0) AS borrowed_copies,
        GREATEST(
            b.total_copies - COALESCE(l.borrowed_copies, 0),
            0
        ) AS available_copies,
        CASE
            WHEN b.total_copies - COALESCE(l.borrowed_copies, 0) <= 0
                THEN 'Unavailable'
            ELSE 'Available'
        END AS availability_status
    FROM BOOKS b
    LEFT JOIN (
        SELECT
            book_id,
            COUNT(*) AS borrowed_copies
        FROM LOANS
        WHERE return_date IS NULL
          AND status IN ('Borrowed', 'Overdue')
        GROUP BY book_id
    ) l ON b.book_id = l.book_id
    ORDER BY b.book_id
`);

        res.json(rows);

    } catch (error) {
        console.error('Fetch books error:', error.message);

        res.status(500).json({
            error: 'Failed to fetch books'
        });
    }
});

// ADD NEW BOOK - ADMIN only
router.post(
    '/',
    authenticateToken,
    authorizeRoles('ADMIN'),
    async (req, res) => {
        try {
            const {
                isbn,
                title,
                author,
                category,
                publisher,
                publication_year,
                description,
                language
            } = req.body;

            // Validate required fields
            if (
                typeof title !== 'string' ||
                !title.trim() ||
                typeof author !== 'string' ||
                !author.trim()
            ) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Book title and author are required.'
                });
            }

            // Validate field lengths
            if (title.trim().length > 200 ||
                author.trim().length > 150) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Title or author exceeds the allowed length.'
                });
            }

            if (isbn !== undefined && isbn !== null &&
                (typeof isbn !== 'string' || isbn.trim().length > 20)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'ISBN must be a string of at most 20 characters.'
                });
            }

            if (category && (typeof category !== 'string' ||
                category.trim().length > 100)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid category.'
                });
            }

            if (publisher && (typeof publisher !== 'string' ||
                publisher.trim().length > 150)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid publisher.'
                });
            }

            if (language && (typeof language !== 'string' ||
                language.trim().length > 50)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid language.'
                });
            }

            // Validate publication year when supplied
            let year = null;

            if (
                publication_year !== undefined &&
                publication_year !== null &&
                publication_year !== ''
            ) {
                year = Number(publication_year);

                if (!Number.isInteger(year) || year < 1901 || year > 2155) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Please provide a valid publication year.'
                    });
                }
            }

            const cleanIsbn = isbn?.trim() || null;

            // Insert book using parameterized SQL
            const [result] = await db.query(
                `INSERT INTO BOOKS
                (isbn, title, author, category, publisher,
                 publication_year, description, language)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cleanIsbn,
                    title.trim(),
                    author.trim(),
                    category?.trim() || null,
                    publisher?.trim() || null,
                    year,
                    description?.trim() || null,
                    language?.trim() || 'English'
                ]
            );

            return res.status(201).json({
                status: 'success',
                message: 'Book added successfully.',
                book_id: result.insertId
            });

        } catch (error) {
            console.error('Add book error:', error.message);

            // Handle duplicate ISBN
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    status: 'error',
                    message: 'A book with this ISBN already exists.'
                });
            }

            return res.status(500).json({
                status: 'error',
                message: 'Failed to add book.'
            });
        }
    }
);

// GET BOOK BY ID - Public access
router.get('/:id', async (req, res) => {
    try {
        const bookId = Number(req.params.id);

        if (!Number.isInteger(bookId) || bookId <= 0) {
            return res.status(400).json({
                error: 'Please provide a valid book ID.'
            });
        }

        const [rows] = await db.query(`
    SELECT
        b.*,
        COALESCE(l.borrowed_copies, 0) AS borrowed_copies,
        GREATEST(
            b.total_copies - COALESCE(l.borrowed_copies, 0),
            0
        ) AS available_copies,
        CASE
            WHEN b.total_copies - COALESCE(l.borrowed_copies, 0) <= 0
                THEN 'Unavailable'
            ELSE 'Available'
        END AS availability_status
    FROM BOOKS b
    LEFT JOIN (
        SELECT
            book_id,
            COUNT(*) AS borrowed_copies
        FROM LOANS
        WHERE return_date IS NULL
          AND status IN ('Borrowed', 'Overdue')
        GROUP BY book_id
    ) l ON b.book_id = l.book_id
    WHERE b.book_id = ?
`, [bookId]);

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Book not found.'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Fetch book error:', error.message);

        res.status(500).json({
            error: 'Failed to fetch book'
        });
    }
});

module.exports = router;
