
const express = require('express');
const router = express.Router();
const db = require('../db');

const {
    authenticateToken,
    authorizeRoles
} = require('../middleware/authMiddleware');

// GET /api/demand
// Retrieve book demand with book details
// ADMIN and MEMBER access
router.get(
    '/',
    authenticateToken,
    authorizeRoles('ADMIN', 'MEMBER'),
    async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT
                    d.demand_id,
                    b.book_id,
                    b.title,
                    b.author,
                    b.category,
                    d.period_start,
                    d.period_end,
                    d.request_count,
                    d.loan_count,
                    d.calculated_at
                FROM BOOK_DEMAND d
                JOIN BOOKS b
                    ON d.book_id = b.book_id
                ORDER BY d.request_count DESC
            `);

            res.json(rows);
        } catch (error) {
            console.error('Error fetching book demand:', error.message);
            res.status(500).json({
                message: 'Failed to retrieve book demand'
            });
        }
    }
);

// POST /api/demand/calculate
// Calculate and store demand for a selected period
// ADMIN only

router.post(
    '/calculate',
    authenticateToken,
    authorizeRoles('ADMIN'),
    async (req, res) => {
        try {
            const { period_start, period_end } = req.body;

            // Validate date format and actual calendar dates
            const isValidDate = (value) => {
                if (
                    typeof value !== 'string' ||
                    !/^\d{4}-\d{2}-\d{2}$/.test(value)
                ) {
                    return false;
                }

                const date = new Date(`${value}T00:00:00.000Z`);

                return (
                    !Number.isNaN(date.getTime()) &&
                    date.toISOString().slice(0, 10) === value
                );
            };

            if (
                !isValidDate(period_start) ||
                !isValidDate(period_end)
            ) {
                return res.status(400).json({
                    message: 'Provide valid dates in YYYY-MM-DD format.'
                });
            }

            if (period_end < period_start) {
                return res.status(400).json({
                    message: 'Period end cannot be earlier than period start.'
                });
            }

            // Calculate reservation requests and issued loans
            // separately to avoid multiplying counts through joins.
            await db.query(`
                INSERT INTO BOOK_DEMAND (
                    book_id,
                    period_start,
                    period_end,
                    request_count,
                    loan_count,
                    calculated_at
                )
                SELECT
                    b.book_id,
                    ?,
                    ?,
                    COALESCE(r.request_count, 0),
                    COALESCE(l.loan_count, 0),
                    NOW()
                FROM BOOKS b

                LEFT JOIN (
                    SELECT
                        book_id,
                        COUNT(*) AS request_count
                    FROM RESERVATIONS
                    WHERE reservation_date >= ?
                      AND reservation_date < DATE_ADD(?, INTERVAL 1 DAY)
                    GROUP BY book_id
                ) r ON r.book_id = b.book_id

                LEFT JOIN (
                    SELECT
                        book_id,
                        COUNT(*) AS loan_count
                    FROM LOANS
                    WHERE issue_date BETWEEN ? AND ?
                    GROUP BY book_id
                ) l ON l.book_id = b.book_id

                ON DUPLICATE KEY UPDATE
                    request_count = VALUES(request_count),
                    loan_count = VALUES(loan_count),
                    calculated_at = NOW()
            `, [
                period_start,
                period_end,
                period_start,
                period_end,
                period_start,
                period_end
            ]);

            // Return the updated demand summary
            const [rows] = await db.query(`
                SELECT
                    d.demand_id,
                    b.book_id,
                    b.title,
                    b.author,
                    b.category,
                    d.period_start,
                    d.period_end,
                    d.request_count,
                    d.loan_count,
                    d.calculated_at
                FROM BOOK_DEMAND d
                JOIN BOOKS b ON b.book_id = d.book_id
                WHERE d.period_start = ?
                  AND d.period_end = ?
                ORDER BY d.request_count DESC
            `, [period_start, period_end]);

            res.json({
                message: 'Book demand calculated successfully.',
                period_start,
                period_end,
                total_books: rows.length,
                demand: rows
            });

        } catch (error) {
            console.error('Error calculating book demand:', error.message);

            res.status(500).json({
                message: 'Failed to calculate book demand.'
            });
        }
    }
);

// GET /api/demand/:id
// Retrieve demand for a particular demand ID
// ADMIN and MEMBER access
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('ADMIN', 'MEMBER'),
    async (req, res) => {
        try {
            const demandId = Number(req.params.id);

            if (!Number.isInteger(demandId) || demandId <= 0) {
                return res.status(400).json({
                    message: 'Please provide a valid demand ID.'
                });
            }

            const [rows] = await db.query(`
                SELECT
                    d.demand_id,
                    b.book_id,
                    b.title,
                    b.author,
                    b.category,
                    d.period_start,
                    d.period_end,
                    d.request_count,
                    d.loan_count,
                    d.calculated_at
                FROM BOOK_DEMAND d
                JOIN BOOKS b
                    ON d.book_id = b.book_id
                WHERE d.demand_id = ?
            `, [demandId]);

            if (rows.length === 0) {
                return res.status(404).json({
                    message: 'Demand record not found'
                });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error('Error fetching demand record:', error.message);
            res.status(500).json({
                message: 'Failed to retrieve demand record'
            });
        }
    }
);

module.exports = router;
