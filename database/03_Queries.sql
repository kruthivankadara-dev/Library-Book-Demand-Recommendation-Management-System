-- Query demonstrations for Stage 2.
-- Run after 01_schema.sql and 02_sample_data.sql.
USE library_demand_db;

-- Basic retrieval
SELECT * FROM MEMBERS;
SELECT * FROM BOOKS;
SELECT * FROM LOANS;
SELECT * FROM RESERVATIONS;
SELECT * FROM RATINGS;
SELECT * FROM BOOK_DEMAND;

-- JOIN: loan information with member and book names
SELECT l.loan_id, m.full_name, b.title, l.issue_date, l.due_date, l.return_date, l.status
FROM LOANS l
JOIN MEMBERS m ON l.member_id = m.member_id
JOIN BOOKS b ON l.book_id = b.book_id
ORDER BY l.loan_id;

-- JOIN: reservation information with member and book names
SELECT r.reservation_id, m.full_name, b.title, r.reservation_date, r.status, r.queue_position
FROM RESERVATIONS r
JOIN MEMBERS m ON r.member_id = m.member_id
JOIN BOOKS b ON r.book_id = b.book_id
ORDER BY r.reservation_id;

-- JOIN: ratings and reviews, highest rating first
SELECT m.full_name, b.title, r.rating, r.review_text
FROM RATINGS r
JOIN MEMBERS m ON r.member_id = m.member_id
JOIN BOOKS b ON r.book_id = b.book_id
ORDER BY r.rating DESC;

-- Demand ranking
SELECT b.title, b.category, d.request_count, d.loan_count
FROM BOOK_DEMAND d
JOIN BOOKS b ON d.book_id = b.book_id
ORDER BY d.request_count DESC;

-- Aggregate: number of books per category
SELECT category, COUNT(*) AS total_books
FROM BOOKS
GROUP BY category
ORDER BY total_books DESC;

-- Aggregate: average rating and number of ratings per book
SELECT b.title, ROUND(AVG(r.rating), 2) AS average_rating,
       COUNT(r.rating_id) AS total_ratings
FROM BOOKS b
JOIN RATINGS r ON b.book_id = r.book_id
GROUP BY b.book_id, b.title
ORDER BY average_rating DESC;

-- Subquery: demand above the average request count
SELECT b.title, d.request_count, d.loan_count
FROM BOOK_DEMAND d
JOIN BOOKS b ON d.book_id = b.book_id
WHERE d.request_count > (SELECT AVG(request_count) FROM BOOK_DEMAND)
ORDER BY d.request_count DESC;

-- HAVING: categories with more than one book
SELECT category, COUNT(*) AS total_books
FROM BOOKS
GROUP BY category
HAVING COUNT(*) > 1;

-- UPDATE demonstration; sets member 1's department
UPDATE MEMBERS
SET department = 'Computer Science and Engineering'
WHERE member_id = 1;

SELECT member_id, full_name, department
FROM MEMBERS
WHERE member_id = 1;

-- INSERT/DELETE demonstration; run in order. Final SELECT should return Empty set.
INSERT INTO MEMBERS (full_name, email, department)
VALUES ('Test Member', 'testmember@example.com', 'Testing');

SELECT * FROM MEMBERS WHERE email = 'testmember@example.com';

DELETE FROM MEMBERS WHERE email = 'testmember@example.com';

SELECT * FROM MEMBERS WHERE email = 'testmember@example.com';

-- The language column is already part of 01_schema.sql.
-- Do NOT run ALTER TABLE BOOKS ADD COLUMN language again.
SELECT book_id, title, language FROM BOOKS;

-- Index verification
SHOW INDEX FROM BOOKS;
SHOW INDEX FROM LOANS;
SHOW INDEX FROM RESERVATIONS;

-- EXPLAIN: category index
EXPLAIN
SELECT book_id, title, category
FROM BOOKS
WHERE category = 'Programming';

-- EXPLAIN: issue date index
EXPLAIN
SELECT *
FROM LOANS
WHERE issue_date >= '2026-10-10';

