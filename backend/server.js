
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');
const { connectMongoDB } = require('./mongo');

const app = express();

app.use(cors());
app.use(express.json());

// Basic route to check whether the server is running
app.get('/', (req, res) => {
    res.json({
        message: 'Library Book Demand & Recommendation Management System API is running'
    });
});

// Check the MySQL database connection
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DATABASE() AS database_name'
        );

        res.json({
            status: 'success',
            message: 'Backend connected to MySQL successfully',
            database: rows[0].database_name
        });
    } catch (error) {
        console.error('Database connection error:', error.message);

        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            detail: error.message
        });
    }
});

// Check MongoDB connection
app.get('/api/health/mongodb', (req, res) => {
    const mongoDb = app.locals.mongoDb;

    if (!mongoDb) {
        return res.status(503).json({
            status: 'error',
            message: 'MongoDB is not connected'
        });
    }

    res.json({
        status: 'success',
        message: 'Backend connected to MongoDB successfully',
        database: mongoDb.databaseName
    });
});

// Existing API routes
const PORT = process.env.PORT || 5000;

const booksRouter = require('./routes/books');
app.use('/api/books', booksRouter);

const membersRouter = require('./routes/members');
app.use('/api/members', membersRouter);

const loansRouter = require('./routes/loans');
app.use('/api/loans', loansRouter);

const reservationsRouter = require('./routes/reservations');
app.use('/api/reservations', reservationsRouter);

const ratingsRouter = require('./routes/ratings');
app.use('/api/ratings', ratingsRouter);

const demandRouter = require('./routes/demand');
app.use('/api/demand', demandRouter);

const recommendationsRouter = require('./routes/recommendations');
app.use('/api/recommendations', recommendationsRouter);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// Start Express and connect to MongoDB

async function startServer() {
    try {
        // Connect to MongoDB first
        const mongoDb = await connectMongoDB();

        // Store MongoDB connection in Express
        app.locals.mongoDb = mongoDb;

        console.log('MongoDB connection initialized.');

    } catch (error) {
        console.error(
            'MongoDB connection failed:',
            error.message
        );

        console.log(
            'MySQL APIs will continue running normally.'
        );
    }

    // Start Express server
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

startServer();
