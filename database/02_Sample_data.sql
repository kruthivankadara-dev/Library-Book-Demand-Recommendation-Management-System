-- Sample data used for the Stage 2 demonstrations.
-- Run after 01_schema.sql on a fresh database.
USE library_demand_db;

INSERT INTO MEMBERS (full_name, email, department) VALUES
('Ananya Sharma', 'ananya@example.com', 'Computer Science'),
('Rahul Verma', 'rahul@example.com', 'Electronics'),
('Priya Reddy', 'priya@example.com', 'Information Science'),
('Arjun Kumar', 'arjun@example.com', 'Computer Science'),
('Sneha Rao', 'sneha@example.com', 'Mechanical');

INSERT INTO BOOKS (isbn, title, author, category, publisher, publication_year, description) VALUES
('9780131103627', 'The C Programming Language', 'Brian Kernighan', 'Programming', 'Prentice Hall', 1988, 'A classic introduction to C programming'),
('9780132350884', 'Clean Code', 'Robert C. Martin', 'Software Engineering', 'Prentice Hall', 2008, 'Principles of writing maintainable software'),
('9780596007126', 'Head First Design Patterns', 'Eric Freeman', 'Software Engineering', 'O''Reilly Media', 2004, 'An introduction to reusable software design patterns'),
('9781491950296', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Databases', 'O''Reilly Media', 2017, 'Concepts for reliable and scalable data systems'),
('9780134685991', 'Effective Java', 'Joshua Bloch', 'Programming', 'Addison-Wesley', 2018, 'Best practices for Java development'),
('9781617294945', 'Spring in Action', 'Craig Walls', 'Web Development', 'Manning', 2018, 'Building applications with the Spring framework'),
('9781492056355', 'Fundamentals of Software Architecture', 'Mark Richards', 'Software Architecture', 'O''Reilly Media', 2020, 'An introduction to architectural styles and trade-offs'),
('9780134494166', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'Artificial Intelligence', 'Pearson', 2020, 'Foundations of artificial intelligence');

INSERT INTO LOANS (member_id, book_id, issue_date, due_date, return_date, status) VALUES
(1, 1, '2026-10-01', '2026-10-15', '2026-10-12', 'Returned'),
(2, 2, '2026-10-05', '2026-10-19', NULL, 'Borrowed'),
(3, 4, '2026-10-06', '2026-10-20', NULL, 'Borrowed'),
(4, 5, '2026-10-08', '2026-10-22', NULL, 'Borrowed'),
(5, 3, '2026-10-10', '2026-10-24', '2026-10-18', 'Returned'),
(1, 6, '2026-10-12', '2026-10-26', NULL, 'Borrowed'),
(2, 8, '2026-10-14', '2026-10-28', NULL, 'Borrowed'),
(3, 7, '2026-10-15', '2026-10-29', NULL, 'Borrowed');

INSERT INTO RESERVATIONS (member_id, book_id, status, queue_position, expiry_date) VALUES
(1, 2, 'Active', 1, '2026-11-05'),
(2, 4, 'Active', 1, '2026-11-06'),
(3, 5, 'Fulfilled', NULL, '2026-10-20'),
(4, 6, 'Active', 2, '2026-11-07'),
(5, 8, 'Cancelled', NULL, NULL);

INSERT INTO RATINGS (member_id, book_id, rating, review_text) VALUES
(1, 1, 5, 'Excellent introduction to C programming'),
(2, 2, 5, 'Very useful for writing clean code'),
(3, 4, 4, 'Helpful for understanding database systems'),
(4, 5, 5, 'Great reference for Java developers'),
(5, 3, 4, 'Useful explanation of design patterns'),
(1, 8, 5, 'Excellent introduction to artificial intelligence');

INSERT INTO BOOK_DEMAND (book_id, period_start, period_end, request_count, loan_count) VALUES
(1, '2026-10-01', '2026-10-31', 12, 8),
(2, '2026-10-01', '2026-10-31', 18, 10),
(3, '2026-10-01', '2026-10-31', 9, 6),
(4, '2026-10-01', '2026-10-31', 15, 9),
(5, '2026-10-01', '2026-10-31', 20, 12),
(8, '2026-10-01', '2026-10-31', 25, 14);

-- Verification:
-- SELECT * FROM MEMBERS;
-- SELECT * FROM BOOKS;
-- SELECT * FROM LOANS;
-- SELECT * FROM RESERVATIONS;
-- SELECT * FROM RATINGS;
-- SELECT * FROM BOOK_DEMAND;

