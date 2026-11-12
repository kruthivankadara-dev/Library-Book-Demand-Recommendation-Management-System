
const express = require("express");
const router = express.Router();
const db = require("../db");

const {
  authenticateToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

// GET /api/recommendations/:memberId
router.get(
  "/:memberId",
  authenticateToken,
  authorizeRoles("ADMIN", "MEMBER"),
  async (req, res) => {
    try {
      const memberId = Number(req.params.memberId);

      // Validate member ID
      if (!Number.isInteger(memberId) || memberId <= 0) {
        return res.status(400).json({
          error: "Please provide a valid member ID.",
        });
      }

      // MEMBER can access only their own recommendations
      if (
        req.user.role === "MEMBER" &&
        req.user.memberId !== memberId
      ) {
        return res.status(403).json({
          error: "You can only access your own recommendations.",
        });
      }

      // Confirm that the reader exists
      const [members] = await db.query(
        "SELECT member_id FROM MEMBERS WHERE member_id = ?",
        [memberId]
      );

      if (members.length === 0) {
        return res.status(404).json({
          error: "Member not found.",
        });
      }

      // Retrieve books, ratings, borrowing history and demand
      const [books] = await db.query(
        `SELECT book_id, title, author, category
         FROM BOOKS`
      );

      const [ratings] = await db.query(
        `SELECT r.member_id, r.book_id, r.rating, b.category
         FROM RATINGS r
         JOIN BOOKS b ON b.book_id = r.book_id`
      );

      const [loans] = await db.query(
        `SELECT l.member_id, l.book_id, b.category
         FROM LOANS l
         JOIN BOOKS b ON b.book_id = l.book_id`
      );

      const [demands] = await db.query(
        `SELECT book_id, request_count, loan_count
         FROM BOOK_DEMAND`
      );

      // Build the current reader's rating history
      const myRatings = ratings.filter(
        (r) => Number(r.member_id) === memberId
      );

      const ratedBookIds = new Set(
        myRatings.map((r) => Number(r.book_id))
      );

      // Content-based filtering
      const categoryAffinity = {};

      for (const r of myRatings) {
        if (Number(r.rating) >= 4) {
          categoryAffinity[r.category] =
            (categoryAffinity[r.category] || 0) + 2;
        }
      }

      for (const loan of loans) {
        if (Number(loan.member_id) === memberId) {
          categoryAffinity[loan.category] =
            (categoryAffinity[loan.category] || 0) + 1;
        }
      }

      // Build each reader's book-rating map
      const userRatings = new Map();

      for (const r of ratings) {
        const uid = Number(r.member_id);
        const bid = Number(r.book_id);

        if (!userRatings.has(uid)) {
          userRatings.set(uid, new Map());
        }

        userRatings.get(uid).set(bid, Number(r.rating));
      }

      const myRatingMap = userRatings.get(memberId) || new Map();
      const similarUsers = [];

      // Collaborative filtering
      for (const [uid, theirRatings] of userRatings) {
        if (uid === memberId) continue;

        let similarityTotal = 0;
        let commonBooks = 0;

        for (const [bid, myRating] of myRatingMap) {
          if (theirRatings.has(bid)) {
            const theirRating = theirRatings.get(bid);

            similarityTotal +=
              1 - Math.abs(myRating - theirRating) / 4;

            commonBooks++;
          }
        }

        if (commonBooks > 0) {
          similarUsers.push({
            memberId: uid,
            similarity:
              (similarityTotal / commonBooks) *
              (commonBooks / (commonBooks + 2)),
            ratings: theirRatings,
          });
        }
      }

      similarUsers.sort(
        (a, b) => b.similarity - a.similarity
      );

      const nearestUsers = similarUsers.slice(0, 5);

      // Aggregate demand records for each book
      const demandByBook = new Map();

      for (const d of demands) {
        const bid = Number(d.book_id);

        const current = demandByBook.get(bid) || {
          requestCount: 0,
          loanCount: 0,
        };

        current.requestCount += Number(d.request_count || 0);
        current.loanCount += Number(d.loan_count || 0);

        demandByBook.set(bid, current);
      }

      // Normalize popularity
      const maxLoans = Math.max(
        1,
        ...Array.from(demandByBook.values()).map(
          (item) => item.loanCount
        )
      );

      const maxDemand = Math.max(
        1,
        ...Array.from(demandByBook.values()).map(
          (item) => item.requestCount
        )
      );

      // Calculate average rating for every book
      const averageRatings = new Map();

      for (const b of books) {
        const bookRatings = ratings.filter(
          (r) => Number(r.book_id) === Number(b.book_id)
        );

        averageRatings.set(
          Number(b.book_id),
          bookRatings.length
            ? bookRatings.reduce(
                (sum, r) => sum + Number(r.rating),
                0
              ) / bookRatings.length
            : 0
        );
      }

      // Generate hybrid recommendations
      const recommendations = books
        .filter(
          (b) => !ratedBookIds.has(Number(b.book_id))
        )
        .map((book) => {
          const bookId = Number(book.book_id);

          const bookDemand = demandByBook.get(bookId) || {
            requestCount: 0,
            loanCount: 0,
          };

          const loanCount = bookDemand.loanCount;
          const requestCount = bookDemand.requestCount;

          // Content-based score (35%)
          const contentScore = Math.min(
            1,
            (categoryAffinity[book.category] || 0) / 5
          );

          // Collaborative filtering score (35%)
          let collaborativeNumerator = 0;
          let collaborativeDenominator = 0;

          for (const user of nearestUsers) {
            if (user.ratings.has(bookId)) {
              collaborativeNumerator +=
                user.similarity *
                user.ratings.get(bookId) / 5;

              collaborativeDenominator += user.similarity;
            }
          }

          const collaborativeScore =
            collaborativeDenominator > 0
              ? collaborativeNumerator /
                collaborativeDenominator
              : (averageRatings.get(bookId) || 0) / 5;

          // Borrowing popularity score (15%)
          const popularityScore = Math.min(
            1,
            loanCount / maxLoans
          );

          // Recorded demand score (15%)
          const demandScore = Math.min(
            1,
            requestCount / maxDemand
          );

          // Final weighted score
          const score =
            0.35 * contentScore +
            0.35 * collaborativeScore +
            0.15 * popularityScore +
            0.15 * demandScore;

          // Recommendation explanations
          const reasons = [];

          if (contentScore > 0) {
            reasons.push("Matches your reading interests");
          }

          if (collaborativeDenominator > 0) {
            reasons.push(
              "Liked by readers with similar ratings"
            );
          }

          if (popularityScore >= 0.5) {
            reasons.push("Frequently borrowed");
          }

          if (demandScore >= 0.5) {
            reasons.push("High recorded demand");
          }

          if (reasons.length === 0) {
            reasons.push(
              "Suggested based on overall book ratings"
            );
          }

          return {
            ...book,

            average_rating: Number(
              (averageRatings.get(bookId) || 0).toFixed(2)
            ),

            loan_count: loanCount,
            request_count: requestCount,

            score: Number(
              Math.max(0, Math.min(1, score)).toFixed(4)
            ),

            reasons,
          };
        })
        .sort((a, b) => b.score - a.score);

      // Return recommendations
      res.json({
        member_id: memberId,
        recommendation_method: "Hybrid",
        count: recommendations.length,
        recommendations,
      });

    } catch (error) {
      console.error("Recommendation error:", error.message);

      res.status(500).json({
        error: "Could not generate recommendations.",
      });
    }
  }
);

module.exports = router;
