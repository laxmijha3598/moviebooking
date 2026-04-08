const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.DB_PATH
  ? process.env.DB_PATH
  : path.join(__dirname, "..", "movie_booking.db");
const db = new sqlite3.Database(dbPath);

const TOTAL_SEATS = 20;

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initializeDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS seats (
      seat_number INTEGER PRIMARY KEY,
      is_booked INTEGER NOT NULL DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS booking_seats (
      booking_id TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      PRIMARY KEY (booking_id, seat_number),
      FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
      FOREIGN KEY (seat_number) REFERENCES seats(seat_number)
    )
  `);

  const seatCount = await get("SELECT COUNT(*) AS count FROM seats");
  if (!seatCount || seatCount.count < TOTAL_SEATS) {
    for (let i = 1; i <= TOTAL_SEATS; i += 1) {
      await run("INSERT OR IGNORE INTO seats (seat_number, is_booked) VALUES (?, 0)", [i]);
    }
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initializeDb,
  TOTAL_SEATS,
};
