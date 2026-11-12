
const express = require('express');
const router = express.Router();
const db = require('../db');

const {
    authenticateToken,
    authorizeRoles
} = require('../middleware/authMiddleware');

// Recalculate FIFO queue positions for all active reservations
async function updateQueuePositions(connection, bookId) {
    const [reservations] = await connection.query(
        `SELECT reservation_id
         FROM RESERVATIONS
         WHERE book_id = ?
           AND status = 'Active'
         ORDER BY reservation_date ASC, reservation_id ASC
         FOR UPDATE`,
        [bookId]
    );

    for (let i = 0; i < reservations.length; i++) {
        await connection.query(
            `UPDATE RESERVATIONS
             SET queue_position = ?
             WHERE reservation_id = ?`,
            [i + 1, reservations[i].reservation_id]
        );
    }
}

// ======================================================
// POST: Create a reservation
// POST /api/reservations
// ADMIN and MEMBER
// ======================================================

router.post(
    '/',
    authenticateToken,
    authorizeRoles('ADMIN', 'MEMBER'),
    async (req, res) => {
        let connection;

        try {
            const bookId = Number(req.body.book_id);

            // Members can reserve only for themselves
            const memberId = req.user.role === 'MEMBER'
                ? Number(req.user.memberId)
                : Number(req.body.member_id);

            if (
                !Number.isInteger(memberId) || memberId <= 0 ||
                !Number.isInteger(bookId) || bookId <= 0
            ) {
                return res.status(400).json({
                    message: 'Valid member_id and book_id are required.'
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            // Lock the book row to prevent simultaneous
            // reservation and issue operations from racing.
            const [books] = await connection.query(
                `SELECT book_id, title, total_copies
                 FROM BOOKS
                 WHERE book_id = ?
                 FOR UPDATE`,
                [bookId]
            );

            if (books.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    message: 'Book not found.'
                });
            }

            const [members] = await connection.query(
                `SELECT member_id
                 FROM MEMBERS
                 WHERE member_id = ?`,
                [memberId]
            );

            if (members.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    message: 'Member not found.'
                });
            }

            const book = books[0];

            // Count copies currently borrowed or overdue
            const [loanCounts] = await connection.query(
                `SELECT COUNT(*) AS borrowed_copies
                 FROM LOANS
                 WHERE book_id = ?
                   AND return_date IS NULL
                   AND LOWER(TRIM(status)) IN ('borrowed', 'overdue')`,
                [bookId]
            );

            const borrowedCopies = Number(
                loanCounts[0].borrowed_copies
            );

            // Reservations are allowed only when every copy is borrowed
            if (borrowedCopies < Number(book.total_copies)) {
                await connection.rollback();
                return res.status(409).json({
                    message: 'Reservations are allowed only when all copies are borrowed.',
                    total_copies: book.total_copies,
                    borrowed_copies: borrowedCopies
                });
            }

            // Prevent duplicate active reservations
            const [existing] = await connection.query(
                `SELECT reservation_id
                 FROM RESERVATIONS
                 WHERE member_id = ?
                   AND book_id = ?
                   AND status = 'Active'
                 LIMIT 1`,
                [memberId, bookId]
            );

            if (existing.length > 0) {
                await connection.rollback();
                return res.status(409).json({
                    message: 'You already have an active reservation for this book.',
                    reservation_id: existing[0].reservation_id
                });
            }

            // Calculate next queue position
            const [queueRows] = await connection.query(
                `SELECT COUNT(*) AS queue_count
                 FROM RESERVATIONS
                 WHERE book_id = ?
                   AND status = 'Active'`,
                [bookId]
            );

            const queuePosition =
                Number(queueRows[0].queue_count) + 1;

            const [result] = await connection.query(
                `INSERT INTO RESERVATIONS
                 (member_id, book_id, reservation_date,
                  status, queue_position)
                 VALUES (?, ?, CURDATE(), 'Active', ?)`,
                [memberId, bookId, queuePosition]
            );

            await updateQueuePositions(connection, bookId);

            const [created] = await connection.query(
                `SELECT
                    r.reservation_id,
                    r.member_id,
                    m.full_name,
                    r.book_id,
                    b.title,
                    r.reservation_date,
                    r.status,
                    r.queue_position
                 FROM RESERVATIONS r
                 JOIN MEMBERS m ON m.member_id = r.member_id
                 JOIN BOOKS b ON b.book_id = r.book_id
                 WHERE r.reservation_id = ?`,
                [result.insertId]
            );

            await connection.commit();

            return res.status(201).json({
                message: 'Reservation created successfully.',
                reservation: created[0]
            });

        } catch (error) {
            if (connection) await connection.rollback();

            console.error('Create reservation error:', error.message);

            return res.status(500).json({
                message: 'Failed to create reservation.'
            });

        } finally {
            if (connection) connection.release();
        }
    }
);


// ======================================================
// GET: Get all reservations
// GET /api/reservations
// ADMIN only
// ======================================================

router.get(
    '/',
    authenticateToken,
    authorizeRoles('ADMIN'),
    async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT
                    r.reservation_id,
                    r.member_id,
                    m.full_name,
                    r.book_id,
                    b.title,
                    r.reservation_date,
                    r.status,
                    CASE
                        WHEN r.status = 'Active' THEN (
                            SELECT COUNT(*)
                            FROM RESERVATIONS r2
                            WHERE r2.book_id = r.book_id
                              AND r2.status = 'Active'
                              AND (
                                  r2.reservation_date < r.reservation_date
                                  OR (
                                      r2.reservation_date = r.reservation_date
                                      AND r2.reservation_id <= r.reservation_id
                                  )
                              )
                        )
                        ELSE NULL
                    END AS queue_position
                FROM RESERVATIONS r
                JOIN MEMBERS m ON m.member_id = r.member_id
                JOIN BOOKS b ON b.book_id = r.book_id
                ORDER BY r.reservation_id
            `);

            res.json(rows);

        } catch (error) {
            console.error('Get reservations error:', error.message);
            res.status(500).json({
                message: 'Failed to retrieve reservations.'
            });
        }
    }
);


// ======================================================
// GET: Get reservations for a member
// GET /api/reservations/member/:memberId
// ADMIN and MEMBER (own records only)
// ======================================================

router.get(
    '/member/:memberId',
    authenticateToken,
    authorizeRoles('ADMIN', 'MEMBER'),
    async (req, res) => {
        try {
            const memberId = Number(req.params.memberId);

            if (!Number.isInteger(memberId) || memberId <= 0) {
                return res.status(400).json({
                    message: 'Please provide a valid member ID.'
                });
            }

            if (
                req.user.role === 'MEMBER' &&
                Number(req.user.memberId) !== memberId
            ) {
                return res.status(403).json({
                    message: 'You can only view your own reservations.'
                });
            }

            const [rows] = await db.query(
                `SELECT
                    r.reservation_id,
                    r.member_id,
                    r.book_id,
                    b.title,
                    b.author,
                    r.reservation_date,
                    r.status,
                    CASE
                        WHEN r.status = 'Active' THEN (
                            SELECT COUNT(*)
                            FROM RESERVATIONS r2
                            WHERE r2.book_id = r.book_id
                              AND r2.status = 'Active'
                              AND (
                                  r2.reservation_date < r.reservation_date
                                  OR (
                                      r2.reservation_date = r.reservation_date
                                      AND r2.reservation_id <= r.reservation_id
                                  )
                              )
                        )
                        ELSE NULL
                    END AS queue_position
                 FROM RESERVATIONS r
                 JOIN BOOKS b ON b.book_id = r.book_id
                 WHERE r.member_id = ?
                 ORDER BY r.reservation_date DESC, r.reservation_id DESC`,
                [memberId]
            );

            return res.json(rows);

        } catch (error) {
            console.error('Get member reservations error:', error.message);
            return res.status(500).json({
                message: 'Failed to retrieve member reservations.'
            });
        }
    }
);


// ======================================================
// PUT: Cancel an active reservation
// PUT /api/reservations/:id/cancel
// ADMIN and MEMBER (own reservation only)
// ======================================================

router.put(
    '/:id/cancel',
    authenticateToken,
    authorizeRoles('ADMIN', 'MEMBER'),
    async (req, res) => {
        let connection;

        try {
            const reservationId = Number(req.params.id);

            if (!Number.isInteger(reservationId) || reservationId <= 0) {
                return res.status(400).json({
                    message: 'Please provide a valid reservation ID.'
                });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [initialRows] = await connection.query(
                `SELECT reservation_id, member_id, book_id, status
                 FROM RESERVATIONS
                 WHERE reservation_id = ?`,
                [reservationId]
            );

            if (initialRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    message: 'Reservation not found.'
                });
            }

            const initial = initialRows[0];

            if (
                req.user.role === 'MEMBER' &&
                Number(req.user.memberId) !== Number(initial.member_id)
            ) {
                await connection.rollback();
                return res.status(403).json({
                    message: 'You can only cancel your own reservations.'
                });
            }

            // Lock book row to serialize queue changes for this book
            await connection.query(
                `SELECT book_id
                 FROM BOOKS
                 WHERE book_id = ?
                 FOR UPDATE`,
                [initial.book_id]
            );

            const [rows] = await connection.query(
                `SELECT reservation_id, member_id, book_id, status
                 FROM RESERVATIONS
                 WHERE reservation_id = ?
                 FOR UPDATE`,
                [reservationId]
            );

            const reservation = rows[0];

            if (reservation.status !== 'Active') {
                await connection.rollback();
                return res.status(409).json({
                    message: 'Only active reservations can be cancelled.'
                });
            }

            await connection.query(
                `UPDATE RESERVATIONS
                 SET status = 'Cancelled',
                     queue_position = NULL
                 WHERE reservation_id = ?`,
                [reservationId]
            );

            await updateQueuePositions(connection, reservation.book_id);

            await connection.commit();

            return res.json({
                message: 'Reservation cancelled successfully.',
                reservation_id: reservationId
            });

        } catch (error) {
            if (connection) await connection.rollback();

            console.error('Cancel reservation error:', error.message);

            return res.status(500).json({
                message: 'Failed to cancel reservation.'
            });

        } finally {
            if (connection) connection.release();
        }
    }
);


// ======================================================
// GET: Get reservation by ID
// GET /api/reservations/:id
// ADMIN can view any; MEMBER can view own
// ======================================================

router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('ADMIN', 'MEMBER'),
    async (req, res) => {
        try {
            const reservationId = Number(req.params.id);

            if (!Number.isInteger(reservationId) || reservationId <= 0) {
                return res.status(400).json({
                    message: 'Please provide a valid reservation ID.'
                });
            }

            const [rows] = await db.query(
                `SELECT *
                 FROM RESERVATIONS
                 WHERE reservation_id = ?`,
                [reservationId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    message: 'Reservation not found.'
                });
            }

            const reservation = rows[0];

            if (
                req.user.role === 'MEMBER' &&
                Number(req.user.memberId) !== Number(reservation.member_id)
            ) {
                return res.status(403).json({
                    message: 'You can only view your own reservations.'
                });
            }

            return res.json(reservation);

        } catch (error) {
            console.error('Get reservation error:', error.message);
            return res.status(500).json({
                message: 'Failed to retrieve reservation.'
            });
        }
    }
);

module.exports = router;
