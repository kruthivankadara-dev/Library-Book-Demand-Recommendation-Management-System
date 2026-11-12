# 📚 Library Book Demand & Recommendation Management System

A full-stack library management platform that combines **transactional database management, demand analytics, and hybrid book recommendations** to improve library operations and personalize the reading experience.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Node.js](https://img.shields.io/badge/Node.js-Runtime-green)
![Express](https://img.shields.io/badge/Express.js-Backend-lightgrey)
![MySQL](https://img.shields.io/badge/MySQL-Database-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Analytics-green)
![Status](https://img.shields.io/badge/Status-Developed-success)

---

## 🚀 Overview

Traditional library management systems primarily focus on maintaining book records, issuing books, and tracking returns. However, they often provide limited support for understanding book demand, managing reservation queues, and generating personalized recommendations.

The **Library Book Demand & Recommendation Management System** addresses these challenges through an integrated full-stack application.

It combines MySQL for structured transactional data with MongoDB for reader activity analytics, while a hybrid recommendation approach helps members discover relevant books.

The system provides separate experiences for administrators and library members, with role-based access, inventory management, reservation handling, demand analysis, and personalized recommendations.

## 🎯 Key Features

### 👨‍💼 Administrator Module

- Secure administrator authentication.
- Dashboard for managing library operations.
- Add, view, and manage books.
- Manage registered library members.
- Monitor book loans and returns.
- Track overdue books.
- Monitor reservations and demand.
- Access library activity and demand information.

### 👤 Member Module

- Member registration and login.
- Browse the library catalogue.
- Search and check book availability.
- Borrowing and loan history.
- Reserve unavailable books.
- Cancel active reservations.
- View reservation queue positions.
- Receive personalized book recommendations.
- Access recommendations using a hybrid approach.

### 📖 Intelligent Reservation Management

The reservation system implements a **First-In, First-Out (FIFO)** queue.

- Reservations are accepted when all copies of a book are borrowed.
- Duplicate active reservations are prevented.
- Queue positions are maintained according to reservation order.
- Members cannot bypass earlier reservations.
- Reservations are fulfilled when the book is actually issued to the eligible member.
- Members can cancel active reservations.

### 🤖 Hybrid Book Recommendation System

The application incorporates a hybrid recommendation approach to provide personalized book suggestions.

The recommendation module considers available recommendation signals and produces ranked book suggestions for members.

Features include:

- Personalized recommendations.
- Ranked recommendation results.
- Exclusion of books already rated by the member.
- Member-specific recommendation access.
- Recommendation response with scoring information.

### 📊 Book Demand Analytics

The system maintains book demand information to help understand borrowing patterns and identify books with higher demand.

Demand information can support better inventory planning and library collection management.

### 📈 Reader Activity Analytics

MongoDB stores reader activity events separately from the structured transactional database.

Examples of recorded events include:

- Book issued.
- Book returned.
- Book marked overdue.

MongoDB aggregation pipelines support analysis of activity by event type and member.

---

## 🏗️ System Architecture

The application follows a layered architecture with separate frontend, backend, and database responsibilities.

```text
                  ┌──────────────────────────┐
                  │       Users              │
                  │  Admin / Library Member  │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │     Next.js Frontend     │
                  │                          │
                  │  Admin Dashboard         │
                  │  Member Dashboard        │
                  │  Authentication          │
                  │  Catalogue & Recommender │
                  └────────────┬─────────────┘
                               │ REST API
                               ▼
                  ┌──────────────────────────┐
                  │   Node.js + Express.js   │
                  │                          │
                  │ Authentication & Access  │
                  │ Book Management           │
                  │ Member Management         │
                  │ Loan & Return Management  │
                  │ Reservation Management    │
                  │ Recommendation Engine     │
                  │ Demand Management         │
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │                          │
                  ▼                          ▼
        ┌──────────────────┐       ┌──────────────────┐
        │      MySQL       │       │     MongoDB      │
        │                  │       │                  │
        │ Books            │       │ Reader Activity  │
        │ Members          │       │ Event Logs       │
        │ Loans            │       │ Activity History │
        │ Reservations     │       │ Aggregations     │
        │ Ratings          │       │                  │
        │ Demand Records   │       │                  │
        └──────────────────┘       └──────────────────┘
```

### Database Design

**MySQL – Transactional Database**

MySQL is used for structured, relational data that requires consistency and integrity.

It manages:
- Books
- Members
- Loans
- Reservations
- Ratings
- Book demand records
- Loan status audit records

**MongoDB – Activity Analytics Database**

MongoDB is used to maintain reader activity and event information.

It supports:
- Activity event storage.
- Reader activity tracking.
- Event-based analytics.
- Aggregation of member and activity information.

This separation allows transactional operations and activity analytics to be handled using databases suited to their respective data requirements.

---

## 🧠 Advanced Database Concepts

The project demonstrates multiple advanced database concepts beyond basic CRUD operations.

| Concept | Implementation | Purpose |
|---|---|---|
| Transactions | MySQL transactions | Maintain consistency during loan and reservation operations |
| Views | `vw_book_demand_summary` | Simplify demand reporting |
| Stored Procedures | `sp_get_book_demand_by_period` | Retrieve demand information for a selected period |
| Triggers | `trg_loan_status_audit` | Automatically maintain loan status audit records |
| Indexing | Indexes on frequently queried columns | Improve query performance |
| NoSQL Aggregation | MongoDB aggregation pipelines | Analyze reader activity |

### 1. Transaction Management

Transactions are used in critical library operations to maintain data consistency.

The implementation uses:
- `BEGIN TRANSACTION`
- `COMMIT`
- `ROLLBACK`
- Row-level locking with `SELECT ... FOR UPDATE`

### 2. Views

The database includes the view:

`vw_book_demand_summary`

It provides a reusable representation of book demand information.

### 3. Stored Procedures

The stored procedure:

`sp_get_book_demand_by_period`

Retrieves book demand information for a specified time period.

### 4. Triggers

The trigger:

`trg_loan_status_audit`

Automatically records loan status changes in the `LOAN_STATUS_AUDIT` table.

### 5. Indexing

Indexes are implemented on frequently queried columns to support efficient data retrieval.

Query execution plans are examined using MySQL `EXPLAIN`.

### 6. NoSQL Aggregation

MongoDB aggregation pipelines are used to summarize reader activity, including event counts by type and member.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Relational Database | MySQL |
| NoSQL Database | MongoDB |
| Authentication | JWT-based authentication |
| API Communication | REST APIs |
| Recommendation | Hybrid recommendation approach |
| Development Tools | VS Code, MySQL Client, MongoDB Shell, Git |

---

## 📁 Project Structure

```text
LibraryBookDemandSystem/
│
├── backend/
│   ├── routes/
│   ├── tests/
│   ├── config/
│   ├── middleware/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── database/
│   ├── schema.sql
│   ├── procedures.sql
│   ├── triggers.sql
│   └── ...
│
├── .gitignore
└── README.md
```

*Note: Adjust the file and folder names above to match the actual repository before publishing.*

---

## ⚙️ Installation & Setup

### Prerequisites

Make sure the following are installed:

- Node.js and npm
- MySQL Server
- MongoDB Server
- Git

### 1. Clone the repository

```bash
git clone https://github.com/kruthivankadara-dev/Library-Book-Demand-Recommendation-Management-System
cd LibraryBookDemandSystem
```

### 2. Configure MySQL

Create the database:

```sql
CREATE DATABASE library_demand_db;
```

Import the SQL scripts from the `database/` directory in the correct dependency order.

Ensure that the required tables, views, stored procedures, triggers, and indexes are created.

### 3. Configure MongoDB

Start MongoDB and create/use the analytics database:

```javascript
use library_analytics
```

The application uses the `reader_activity` collection for reader activity events.

### 4. Configure Backend

```bash
cd backend
npm install
```

Create a `.env` file using the provided `.env.example` as a reference.

Configure your local MySQL, MongoDB, authentication, and server settings.

Start the backend:

```bash
npm run dev
```

The backend runs on port `5000` by default.

### 5. Configure Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create the frontend environment file using `.env.example` and configure the backend API URL.

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 🧪 Testing & Validation

The project includes backend test scripts covering important application workflows.

The verified test areas include:

- Authentication and authorization.
- Book and member operations.
- Book availability.
- Loan issuance.
- Book returns.
- Reservation access and security.
- FIFO reservation handling.
- Demand retrieval.
- Ratings.
- Personalized recommendations.

Frontend validation:

```bash
npm run lint
npm run build
```

Backend syntax validation:

```bash
node --check server.js
```

*Test scripts should be run against a dedicated test database where possible. Some workflow tests create or modify records.*

---

## 🔐 Security & Data Integrity

The application incorporates security and consistency measures such as:

- Role-based authorization for administrators and members.
- JWT-based authentication.
- Member-specific access restrictions.
- Input validation.
- Transaction-based critical operations.
- Row-level locking for concurrent inventory operations.
- Duplicate reservation prevention.
- FIFO reservation enforcement.

Database credentials and authentication secrets must be stored in environment variables and must never be committed to version control.

---

## 💡 Challenges & Engineering Decisions

Some of the key engineering challenges addressed during development include:

**1. Concurrent Book Issuing**

Multiple users may attempt to borrow the same available copy. Transaction management and row-level locking help prevent conflicting inventory updates.

**2. FIFO Reservation Management**

Maintaining queue order while supporting reservation creation, cancellation, and fulfilment requires careful coordination between loan and reservation operations.

**3. Relational and NoSQL Integration**

MySQL handles structured library transactions, while MongoDB provides a separate store for reader activity and analytics.

**4. Personalized Recommendations**

A hybrid recommendation approach helps move the application beyond basic catalogue browsing by providing member-specific suggestions.

---

## 🔮 Future Enhancements

Potential future improvements include:

- Email and in-app reservation notifications.
- Advanced recommendation models using richer reading behaviour.
- Fine-grained demand forecasting.
- Book review and rating submission interface.
- Automated deployment using CI/CD.
- Docker-based application deployment.
- More comprehensive automated integration testing.

---

## 👩‍💻 Contributors

Developed as an academic DBMS project by a team of four.

**Team:** Library Book Demand & Recommendation Management System

---

## ⭐ Why This Project Matters

This project demonstrates the integration of:

- Full-stack application development.
- Relational database design and transaction management.
- NoSQL data storage and aggregation.
- REST API development.
- Authentication and role-based access control.
- Hybrid recommendation systems.
- Database performance and integrity concepts.

It aims to demonstrate how database engineering can solve practical problems in library operations while supporting a more personalized user experience.

---

**If you find this project interesting, consider giving the repository a ⭐!**