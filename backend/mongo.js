const { MongoClient } = require("mongodb");
require("dotenv").config();

const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";

const DATABASE_NAME =
    process.env.MONGODB_DATABASE || "library_analytics";

const client = new MongoClient(MONGODB_URI);

let database = null;

async function connectMongoDB() {
    if (database) {
        return database;
    }

    await client.connect();

    database = client.db(DATABASE_NAME);

    await database.command({ ping: 1 });

    console.log(
        `MongoDB connected successfully: ${DATABASE_NAME}`
    );

    return database;
}

function getMongoDB() {
    if (!database) {
        throw new Error("MongoDB is not connected yet.");
    }

    return database;
}

module.exports = {
    connectMongoDB,
    getMongoDB
};