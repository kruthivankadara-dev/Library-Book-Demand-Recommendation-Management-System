-- Library Book Demand & Recommendation Management System
CREATE DATABASE IF NOT EXISTS library_demand_db;
USE library_demand_db;

CREATE TABLE IF NOT EXISTS MEMBERS (
  member_id INT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_members PRIMARY KEY (member_id),
  CONSTRAINT uq_members_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS BOOKS (
  book_id INT NOT NULL AUTO_INCREMENT,
  isbn VARCHAR(20) UNIQUE,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  publisher VARCHAR(150),
  publication_year YEAR,
  description TEXT,
  language VARCHAR(50) DEFAULT 'English',
  CONSTRAINT pk_books PRIMARY KEY (book_id)
);

CREATE TABLE IF NOT EXISTS LOANS (
  loan_id INT NOT NULL AUTO_INCREMENT,
  member_id INT NOT NULL,
  book_id INT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Borrowed',
  CONSTRAINT pk_loans PRIMARY KEY (loan_id),
  CONSTRAINT fk_loans_member FOREIGN KEY (member_id) REFERENCES MEMBERS(member_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_loans_book FOREIGN KEY (book_id) REFERENCES BOOKS(book_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_loan_dates CHECK (due_date >= issue_date),
  CONSTRAINT chk_loan_status CHECK (status IN ('Borrowed', 'Returned', 'Overdue'))
);

CREATE TABLE IF NOT EXISTS RESERVATIONS (
  reservation_id INT NOT NULL AUTO_INCREMENT,
  member_id INT NOT NULL,
  book_id INT NOT NULL,
  reservation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  queue_position INT,
  expiry_date DATE,
  CONSTRAINT pk_reservations PRIMARY KEY (reservation_id),
  CONSTRAINT fk_reservations_member FOREIGN KEY (member_id) REFERENCES MEMBERS(member_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_book FOREIGN KEY (book_id) REFERENCES BOOKS(book_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_reservation_status CHECK (status IN ('Active', 'Fulfilled', 'Cancelled', 'Expired')),
  CONSTRAINT chk_queue_position CHECK (queue_position IS NULL OR queue_position > 0)
);

CREATE TABLE IF NOT EXISTS RATINGS (
  rating_id INT NOT NULL AUTO_INCREMENT,
  member_id INT NOT NULL,
  book_id INT NOT NULL,
  rating TINYINT NOT NULL,
  review_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_ratings PRIMARY KEY (rating_id),
  CONSTRAINT fk_ratings_member FOREIGN KEY (member_id) REFERENCES MEMBERS(member_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_book FOREIGN KEY (book_id) REFERENCES BOOKS(book_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_rating_value CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT uq_member_book_rating UNIQUE (member_id, book_id)
);

CREATE TABLE IF NOT EXISTS BOOK_DEMAND (
  demand_id INT NOT NULL AUTO_INCREMENT,
  book_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  loan_count INT NOT NULL DEFAULT 0,
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_book_demand PRIMARY KEY (demand_id),
  CONSTRAINT fk_book_demand_book FOREIGN KEY (book_id) REFERENCES BOOKS(book_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_demand_period CHECK (period_end >= period_start),
  CONSTRAINT chk_request_count CHECK (request_count >= 0),
  CONSTRAINT chk_loan_count CHECK (loan_count >= 0),
  CONSTRAINT uq_book_demand_period UNIQUE (book_id, period_start, period_end)
);

-- Secondary indexes created and verified in the MySQL Command Line Client.
CREATE INDEX idx_books_category ON BOOKS(category);
CREATE INDEX idx_books_title ON BOOKS(title);
CREATE INDEX idx_loans_issue_date ON LOANS(issue_date);
CREATE INDEX idx_reservations_status ON RESERVATIONS(status);

-- Verification commands:
-- SHOW TABLES;
-- DESC MEMBERS;
-- DESC BOOKS;
-- DESC LOANS;
-- DESC RESERVATIONS;
-- DESC RATINGS;
-- DESC BOOK_DEMAND;
-- SHOW INDEX FROM BOOKS;
-- SHOW INDEX FROM LOANS;
-- SHOW INDEX FROM RESERVATIONS;

