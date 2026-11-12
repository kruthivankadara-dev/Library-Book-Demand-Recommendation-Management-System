
const express = require('express');
const router = express.Router();
const db = require('../db');

const {
    authenticateToken,
    authorizeRoles
} = require('../middleware/authMiddleware');

// GET /api/ratings
// ADMIN only: Retrieve all ratings with member and book details
router.get(
    '/',
    authenticateToken,
    authorizeRoles('ADMIN'),
    async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT
                    r.rating_id,
                    m.full_name,
                    b.title,
                    r.rating,
                    r.review_text
                FROM RATINGS r
                JOIN MEMBERS m
                    ON r.member_id = m.member_id
                JOIN BOOKS b
                    ON r.book_id = b.book_id
                ORDER BY r.rating DESC
            `);

            res.json(rows);
        } catch (error) {
            console.error('Error fetching ratings:', error.message);
            res.status(500).json({
                message: 'Failed to retrieve ratings'
            });
        }
    }
);

// GET /api/ratings/:id
// ADMIN can retrieve any rating.
// MEMBER can retrieve only their own rating.
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('ADMIN', 'MEMBER'),
    async (req, res) => {
        try {
            const ratingId = Number(req.params.id);

            if (!Number.isInteger(ratingId) || ratingId <= 0) {
                return res.status(400).json({
                    message: 'Please provide a valid rating ID.'
                });
            }

            const [rows] = await db.query(
                `SELECT
                    rating_id,
                    member_id,
                    book_id,
                    rating,
                    review_text
                 FROM RATINGS
                 WHERE rating_id = ?`,
                [ratingId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    message: 'Rating not found.'
                });
            }

            const rating = rows[0];

            if (
                req.user.role === 'MEMBER' &&
                Number(req.user.memberId) !== Number(rating.member_id)
            ) {
                return res.status(403).json({
                    message: 'You can only access your own ratings.'
                });
            }

            res.json(rating);

        } catch (error) {
            console.error('Error fetching rating:', error.message);
            res.status(500).json({
                message: 'Failed to retrieve rating'
            });
        }
    }
);

module.exports = router;
