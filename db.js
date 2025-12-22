const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'empire.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the Empire AI SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Issues Table
        db.run(`CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            status TEXT DEFAULT 'New',
            priority TEXT DEFAULT 'Normal',
            date TEXT,
            description TEXT
        )`);

        // Messages Table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT,
            text TEXT,
            timestamp INTEGER
        )`);

        // Knowledge/Docs Table
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            type TEXT,
            tags TEXT,
            content TEXT,
            added_date TEXT
        )`);

        console.log("Database tables initialized.");

        // Seed initial data if empty
        db.get("SELECT count(*) as count FROM issues", (err, row) => {
            if (row.count === 0) {
                const stmt = db.prepare("INSERT INTO issues (title, status, priority, date) VALUES (?, ?, ?, ?)");
                stmt.run("HVAC Unit 4 Malfunction", "High Priority", "High", "2025-10-24");
                stmt.run("Server Room Temp Alert", "Investigating", "Medium", "2025-10-23");
                stmt.finalize();
                console.log("Seeded initial issues.");
            }
        });
    });
}

module.exports = db;
