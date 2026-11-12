
const express = require('express');
const router = express.Router();

const db = require('../db');
const { getMongoDB } = require('../mongo');

const {
  authenticateToken,
  authorizeRoles
} = require('../middleware/authMiddleware');


// ======================================================
// GET 1: Get all loans with member and book details
// GET /api/loans
// ADMIN ONLY
// ======================================================

router.get(
  '/',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          l.loan_id,
          l.member_id,
          l.book_id,
          m.full_name,
          b.title,
          l.issue_date,
          l.due_date,
          l.return_date,
          l.status
        FROM LOANS l
        JOIN MEMBERS m ON l.member_id = m.member_id
        JOIN BOOKS b ON l.book_id = b.book_id
        ORDER BY l.loan_id
      `);

      res.json(rows);

    } catch (error) {
      console.error('Fetch loans error:', error.message);

      res.status(500).json({
        error: 'Failed to fetch loans'
      });
    }
  }
);


// ======================================================
// GET 2: Get loans for a specific member
// GET /api/loans/member/:memberId
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
          error: 'Please provide a valid member ID.'
        });
      }

      // Members can only access their own loan history.
      if (
        req.user.role === 'MEMBER' &&
        Number(req.user.memberId) !== memberId
      ) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only access your own loan history.'
        });
      }

      const [rows] = await db.query(`
        SELECT
          l.loan_id,
          l.member_id,
          l.book_id,
          b.title,
          l.issue_date,
          l.due_date,
          l.return_date,
          l.status
        FROM LOANS l
        JOIN BOOKS b ON l.book_id = b.book_id
        WHERE l.member_id = ?
        ORDER BY l.issue_date DESC
      `, [memberId]);

      res.json(rows);

    } catch (error) {
      console.error('Fetch member loans error:', error.message);

      res.status(500).json({
        error: 'Failed to fetch member loans'
      });
    }
  }
);


// ======================================================
// GET 3: Detect and retrieve overdue books
// GET /api/loans/overdue
// ADMIN ONLY
// ======================================================

router.get(
  '/overdue',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req, res) => {
    let connection;

    try {
      connection = await db.getConnection();

      await connection.beginTransaction();

      // Find borrowed books whose due dates have passed.
      const [newlyOverdue] = await connection.query(`
        SELECT
          l.loan_id,
          l.member_id,
          l.book_id,
          m.full_name,
          b.title,
          l.due_date
        FROM LOANS l
        JOIN MEMBERS m ON l.member_id = m.member_id
        JOIN BOOKS b ON l.book_id = b.book_id
        WHERE l.status = 'Borrowed'
          AND l.due_date < CURDATE()
        FOR UPDATE
      `);

      // Update newly overdue loans in MySQL.
      if (newlyOverdue.length > 0) {
        const loanIds = newlyOverdue.map(
          loan => loan.loan_id
        );

        const placeholders = loanIds.map(() => '?').join(',');

        await connection.query(
          `UPDATE LOANS
           SET status = 'Overdue'
           WHERE loan_id IN (${placeholders})`,
          loanIds
        );
      }

      // Retrieve all currently overdue books.
      const [overdueLoans] = await connection.query(`
        SELECT
          l.loan_id,
          l.member_id,
          l.book_id,
          m.full_name,
          m.email,
          b.title,
          b.author,
          b.category,
          l.issue_date,
          l.due_date,
          l.status,
          DATEDIFF(CURDATE(), l.due_date) AS days_overdue,

          (
            SELECT COUNT(*)
            FROM LOANS active_l
            WHERE active_l.member_id = l.member_id
              AND active_l.return_date IS NULL
              AND LOWER(TRIM(active_l.status))
                  IN ('borrowed', 'overdue')
          ) AS member_active_loan_count

        FROM LOANS l
        JOIN MEMBERS m ON l.member_id = m.member_id
        JOIN BOOKS b ON l.book_id = b.book_id

        WHERE l.status = 'Overdue'
          AND l.return_date IS NULL

        ORDER BY l.due_date ASC
      `);

      await connection.commit();

      // Record only newly detected overdue events in MongoDB.
      let analyticsLogged = 0;

      try {
        const mongoDb = getMongoDB();

        if (newlyOverdue.length > 0) {
          const activities = newlyOverdue.map(loan => ({
            event_type: 'BOOK_MARKED_OVERDUE',
            loan_id: loan.loan_id,
            member_id: loan.member_id,
            member_name: loan.full_name,
            book_id: loan.book_id,
            book_title: loan.title,
            due_date: loan.due_date,
            occurred_at: new Date(),
            details: 'Book automatically marked as overdue.'
          }));

          const result = await mongoDb
            .collection('reader_activity')
            .insertMany(activities);

          analyticsLogged = result.insertedCount;
        }

      } catch (mongoError) {
        console.error(
          'MongoDB overdue activity logging failed:',
          mongoError.message
        );
      }

      return res.json({
        message: 'Overdue books retrieved successfully.',
        total_overdue: overdueLoans.length,
        newly_marked_overdue: newlyOverdue.length,
        analytics_logged: analyticsLogged,
        overdue_loans: overdueLoans
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      console.error('Overdue books error:', error.message);

      return res.status(500).json({
        error: 'Failed to retrieve overdue books.',
        detail: error.message
      });

    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);


// ======================================================
// POST 1: Issue a book to a member
// POST /api/loans
//
// Request body:
// {
//   "member_id": 1,
//   "book_id": 3
// }
//
// Supports multiple copies and FIFO reservations.
// ======================================================

router.post(
  '/',
  authenticateToken,
  authorizeRoles('ADMIN', 'MEMBER'),
  async (req, res) => {
    let connection;

    try {
      const memberId = Number(req.body.member_id);
      const bookId = Number(req.body.book_id);

      // Members can issue books only for themselves.
      if (
        req.user.role === 'MEMBER' &&
        Number(req.user.memberId) !== memberId
      ) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only issue books for your own account.'
        });
      }

      // Validate input.
      if (
        !Number.isInteger(memberId) ||
        memberId <= 0 ||
        !Number.isInteger(bookId) ||
        bookId <= 0
      ) {
        return res.status(400).json({
          error: 'Valid member_id and book_id are required.'
        });
      }

      connection = await db.getConnection();

      await connection.beginTransaction();

      // Step 1: Check whether the member exists.

      const [members] = await connection.query(
     `SELECT member_id, full_name
      FROM MEMBERS
      WHERE member_id = ?`,
      [memberId]
      );

     if (members.length === 0) {
     await connection.rollback();

     return res.status(404).json({
     error: 'Member not found.'
     });
    }

// Step 2: Lock the book row.
      // This serializes issue and reservation operations
      // for the same book.

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
          error: 'Book not found.'
        });
      }

      // Step 2: Count copies currently borrowed or overdue.

      const [copyCounts] = await connection.query(
        `SELECT COUNT(*) AS borrowed_copies
         FROM LOANS
         WHERE book_id = ?
           AND return_date IS NULL
           AND LOWER(TRIM(status)) IN ('borrowed', 'overdue')`,
        [bookId]
      );

      const borrowedCopies = Number(
        copyCounts[0].borrowed_copies
      );

      if (borrowedCopies >= Number(books[0].total_copies)) {
        await connection.rollback();

        return res.status(409).json({
          error: 'All copies of this book are currently borrowed.'
        });
      }

      // Step 3: Retrieve active reservations in FIFO order.

      const [queue] = await connection.query(
        `SELECT reservation_id, member_id
         FROM RESERVATIONS
         WHERE book_id = ?
           AND status = 'Active'
         ORDER BY reservation_date ASC, reservation_id ASC
         FOR UPDATE`,
        [bookId]
      );

      // Only the first member in the queue can receive the book.
      if (
        queue.length > 0 &&
        Number(queue[0].member_id) !== memberId
      ) {
        await connection.rollback();

        return res.status(409).json({
          error: 'This book is reserved by another member.',
          next_member_id: queue[0].member_id
        });
      }


      // Step 5: Prevent duplicate active loans for the same
      // member and book.

      const [existingLoans] = await connection.query(
        `SELECT loan_id
         FROM LOANS
         WHERE member_id = ?
           AND book_id = ?
           AND return_date IS NULL
           AND LOWER(TRIM(status)) IN ('borrowed', 'overdue')
         FOR UPDATE`,
        [memberId, bookId]
      );

      if (existingLoans.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          error: 'This member already has an active loan for this book.'
        });
      }

      // Step 6: Issue the book for 14 days.

      const [result] = await connection.query(
        `INSERT INTO LOANS
         (member_id, book_id, issue_date, due_date, status)
         VALUES (?, ?, CURDATE(),
                 DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Borrowed')`,
        [memberId, bookId]
      );

      const loanId = result.insertId;

      // Step 7: Fulfil the reservation ONLY after the loan
      // has been successfully inserted for the FIFO member.

      if (
        queue.length > 0 &&
        Number(queue[0].member_id) === memberId
      ) {
        await connection.query(
          `UPDATE RESERVATIONS
           SET status = 'Fulfilled',
               queue_position = NULL
           WHERE reservation_id = ?`,
          [queue[0].reservation_id]
        );

        // Recalculate queue positions for remaining members.

        const [remainingReservations] = await connection.query(
          `SELECT reservation_id
           FROM RESERVATIONS
           WHERE book_id = ?
             AND status = 'Active'
           ORDER BY reservation_date ASC, reservation_id ASC
           FOR UPDATE`,
          [bookId]
        );

        for (let i = 0; i < remainingReservations.length; i++) {
          await connection.query(
            `UPDATE RESERVATIONS
             SET queue_position = ?
             WHERE reservation_id = ?`,
            [
              i + 1,
              remainingReservations[i].reservation_id
            ]
          );
        }
      }

      // Step 8: Retrieve newly created loan.

      const [loanRows] = await connection.query(
        `SELECT
           l.loan_id,
           l.member_id,
           l.book_id,
           m.full_name,
           b.title,
           l.issue_date,
           l.due_date,
           l.return_date,
           l.status
         FROM LOANS l
         JOIN MEMBERS m ON l.member_id = m.member_id
         JOIN BOOKS b ON l.book_id = b.book_id
         WHERE l.loan_id = ?`,
        [loanId]
      );

      await connection.commit();

      // Step 9: Record borrowing activity in MongoDB.

      let analyticsLogged = false;

      try {
        const mongoDb = getMongoDB();

        await mongoDb.collection('reader_activity').insertOne({
          event_type: 'BOOK_ISSUED',
          loan_id: loanId,
          member_id: memberId,
          member_name: members[0].full_name,
          book_id: bookId,
          book_title: books[0].title,
          occurred_at: new Date(),
          details: 'Book successfully issued to reader.'
        });

        analyticsLogged = true;

      } catch (mongoError) {
        console.error(
          'MongoDB issue activity logging failed:',
          mongoError.message
        );
      }

      return res.status(201).json({
        message: 'Book issued successfully.',
        loan: loanRows[0],
        analytics_logged: analyticsLogged
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      console.error('Issue book error:', error.message);

      return res.status(500).json({
        error: 'Failed to issue book.',
        detail: error.message
      });

    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);


// ======================================================
// PUT 1: Return a borrowed book
// PUT /api/loans/:loanId/return
//
// Returning a book does NOT fulfil a reservation.
// The FIFO member must actually receive the book.
// ======================================================

router.put(
  '/:loanId/return',
  authenticateToken,
  authorizeRoles('ADMIN', 'MEMBER'),
  async (req, res) => {
    let connection;

    try {
      const loanId = Number(req.params.loanId);

      if (!Number.isInteger(loanId) || loanId <= 0) {
        return res.status(400).json({
          error: 'Please provide a valid loan ID.'
        });
      }

      connection = await db.getConnection();

      await connection.beginTransaction();

      
      // Step 1: Find the book associated with this loan.
      // This is a non-locking read.

      const [loanReference] = await connection.query(
        `SELECT book_id
         FROM LOANS
         WHERE loan_id = ?`,
        [loanId]
      );

      if (loanReference.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: 'Loan record not found.'
        });
      }

      const bookId = loanReference[0].book_id;

      // Step 2: Lock the book row FIRST.
      // This follows the same locking order as issue/reservation.

      const [books] = await connection.query(
        `SELECT book_id
         FROM BOOKS
         WHERE book_id = ?
         FOR UPDATE`,
        [bookId]
      );

      if (books.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: 'Book record not found.'
        });
      }

      // Step 3: Lock and retrieve the loan.

      const [loans] = await connection.query(
        `SELECT
           l.loan_id,
           l.member_id,
           l.book_id,
           l.status,
           m.full_name,
           b.title
         FROM LOANS l
         JOIN MEMBERS m ON l.member_id = m.member_id
         JOIN BOOKS b ON l.book_id = b.book_id
         WHERE l.loan_id = ?
         FOR UPDATE`,
        [loanId]
      );

      if (loans.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: 'Loan record not found.'
        });
      }

      const loan = loans[0];

      // Step 4: Members can return only their own borrowed books.

      if (
        req.user.role === 'MEMBER' &&
        Number(req.user.memberId) !== Number(loan.member_id)
      ) {
        await connection.rollback();

        return res.status(403).json({
          status: 'error',
          message: 'You can only return books borrowed using your own account.'
        });
      }

      // Step 5: Prevent returning an already returned book.

      if (loan.status === 'Returned') {
        await connection.rollback();

        return res.status(409).json({
          error: 'This book has already been returned.'
        });
      }

      // Step 6: Update loan status and return date.

      await connection.query(
        `UPDATE LOANS
         SET return_date = CURDATE(),
             status = 'Returned'
         WHERE loan_id = ?`,
        [loanId]
      );

      // IMPORTANT:
      // Do NOT fulfil or cancel any reservation here.
      // The active FIFO queue remains unchanged.

      // Step 7: Retrieve updated loan.

      const [updatedLoans] = await connection.query(
        `SELECT
           l.loan_id,
           l.member_id,
           l.book_id,
           m.full_name,
           b.title,
           l.issue_date,
           l.due_date,
           l.return_date,
           l.status
         FROM LOANS l
         JOIN MEMBERS m ON l.member_id = m.member_id
         JOIN BOOKS b ON l.book_id = b.book_id
         WHERE l.loan_id = ?`,
        [loanId]
      );

      await connection.commit();

      // Step 8: Record return activity in MongoDB.

      let analyticsLogged = false;

      try {
        const mongoDb = getMongoDB();

        await mongoDb.collection('reader_activity').insertOne({
          event_type: 'BOOK_RETURNED',
          loan_id: loan.loan_id,
          member_id: loan.member_id,
          member_name: loan.full_name,
          book_id: loan.book_id,
          book_title: loan.title,
          occurred_at: new Date(),
          details: 'Book successfully returned by reader.'
        });

        analyticsLogged = true;

      } catch (mongoError) {
        console.error(
          'MongoDB return activity logging failed:',
          mongoError.message
        );
      }

      return res.json({
        message: 'Book returned successfully.',
        loan: updatedLoans[0],
        analytics_logged: analyticsLogged
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      console.error('Return book error:', error.message);

      return res.status(500).json({
        error: 'Failed to return book.',
        detail: error.message
      });

    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);


module.exports = router;
