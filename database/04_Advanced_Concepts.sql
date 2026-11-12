-- =====================================================
-- STAGE 5: ADVANCED DATABASE CONCEPTS
-- PROJECT: LIBRARY BOOK DEMAND & RECOMMENDATION SYSTEM
-- =====================================================

USE library_demand_db;

-- =====================================================
-- CONCEPT 1: INDEXING
-- =====================================================

-- Display existing indexes on BOOKS
SHOW INDEX FROM BOOKS;

-- Display existing indexes on MEMBERS
SHOW INDEX FROM MEMBERS;

-- Display existing indexes on LOANS
SHOW INDEX FROM LOANS;

-- Display existing indexes on RATINGS
SHOW INDEX FROM RATINGS;

-- Display existing indexes on BOOK_DEMAND
SHOW INDEX FROM BOOK_DEMAND;

-- =====================================================
-- INDEX PERFORMANCE VERIFICATION USING EXPLAIN
-- =====================================================

-- Query 1: Verify category index usage
EXPLAIN
SELECT *
FROM BOOKS
WHERE category = 'Programming';

-- Query 2: Verify member index usage
EXPLAIN
SELECT *
FROM LOANS
WHERE member_id = 1;

-- =====================================================
-- CONCEPT 2: SQL VIEWS
-- =====================================================

-- Create a view combining book details and demand data

CREATE OR REPLACE VIEW vw_book_demand_summary AS
SELECT
    b.book_id,
    b.title,
    b.author,
    b.category,
    bd.period_start,
    bd.period_end,
    bd.request_count,
    bd.loan_count
FROM BOOKS b
INNER JOIN BOOK_DEMAND bd
    ON b.book_id = bd.book_id;

-- Retrieve all records from the view
SELECT *
FROM vw_book_demand_summary;

-- Display books with more than 15 requests
SELECT
    title,
    category,
    request_count,
    loan_count
FROM vw_book_demand_summary
WHERE request_count > 15
ORDER BY request_count DESC;

-- =====================================================
-- CONCEPT 3: STORED PROCEDURES
-- =====================================================

DELIMITER //

CREATE PROCEDURE sp_get_book_demand_by_period(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT
        b.book_id,
        b.title,
        b.author,
        b.category,
        bd.period_start,
        bd.period_end,
        bd.request_count,
        bd.loan_count
    FROM BOOKS b
    INNER JOIN BOOK_DEMAND bd
        ON b.book_id = bd.book_id
    WHERE bd.period_start >= p_start_date
      AND bd.period_end <= p_end_date
    ORDER BY bd.request_count DESC;
END //

DELIMITER ;

-- =====================================================
-- CONCEPT 4: TRIGGERS
-- =====================================================

-- Create audit table for loan status changes

CREATE TABLE IF NOT EXISTS LOAN_STATUS_AUDIT (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELIMITER //

CREATE TRIGGER trg_loan_status_audit
AFTER UPDATE ON LOANS
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO LOAN_STATUS_AUDIT (
            loan_id,
            old_status,
            new_status
        )
        VALUES (
            OLD.loan_id,
            OLD.status,
            NEW.status
        );
    END IF;
END //

DELIMITER ;