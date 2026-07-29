const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'inventory.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;