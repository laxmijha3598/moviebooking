const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
require("dotenv").config();
const { db, run, all, initializeDb, TOTAL_SEATS } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  })
);
app.use(express.json());

function mapSeatRow(seat) {
  return {
    seatNumber: seat.seat_number,
    isBooked: Boolean(seat.is_booked),
  };
}

app.get("/api/seats", async (_req, res) => {
  try {
    const seats = await all("SELECT seat_number, is_booked FROM seats ORDER BY seat_number");
    const bookedCount = seats.filter((seat) => seat.is_booked === 1).length;

    res.json({
      totalSeats: TOTAL_SEATS,
      availableSeats: TOTAL_SEATS - bookedCount,
      bookedSeats: bookedCount,
      seats: seats.map(mapSeatRow),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch seats." });
  }
});

app.post("/api/bookings", async (req, res) => {
  const { seatNumbers } = req.body || {};

  if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return res.status(400).json({ error: "seatNumbers must be a non-empty array." });
  }

  const uniqueSeats = [...new Set(seatNumbers)];
  const hasInvalidSeat = uniqueSeats.some(
    (seat) => !Number.isInteger(seat) || seat < 1 || seat > TOTAL_SEATS
  );

  if (hasInvalidSeat) {
    return res.status(400).json({ error: `Seat numbers must be integers between 1 and ${TOTAL_SEATS}.` });
  }

  const placeholders = uniqueSeats.map(() => "?").join(", ");

  db.serialize(async () => {
    try {
      await run("BEGIN TRANSACTION");

      const seatRows = await all(
        `SELECT seat_number, is_booked FROM seats WHERE seat_number IN (${placeholders})`,
        uniqueSeats
      );

      const unavailable = seatRows
        .filter((seat) => seat.is_booked === 1)
        .map((seat) => seat.seat_number);

      if (unavailable.length > 0) {
        await run("ROLLBACK");
        return res.status(409).json({
          error: "Some seats are already booked.",
          unavailableSeats: unavailable,
        });
      }

      const bookingId = randomUUID();
      const createdAt = new Date().toISOString();

      await run("INSERT INTO bookings (booking_id, created_at) VALUES (?, ?)", [bookingId, createdAt]);

      for (const seatNumber of uniqueSeats) {
        await run("UPDATE seats SET is_booked = 1 WHERE seat_number = ?", [seatNumber]);
        await run("INSERT INTO booking_seats (booking_id, seat_number) VALUES (?, ?)", [bookingId, seatNumber]);
      }

      await run("COMMIT");
      return res.status(201).json({
        message: "Booking created successfully.",
        bookingId,
        seatNumbers: uniqueSeats,
      });
    } catch (error) {
      try {
        await run("ROLLBACK");
      } catch (_rollbackError) {
        // Ignore rollback failures; primary error is returned below.
      }
      return res.status(500).json({ error: "Failed to create booking." });
    }
  });
});

app.delete("/api/bookings/:bookingId", async (req, res) => {
  const { bookingId } = req.params;

  try {
    const seats = await all(
      "SELECT seat_number FROM booking_seats WHERE booking_id = ? ORDER BY seat_number",
      [bookingId]
    );

    if (seats.length === 0) {
      return res.status(404).json({ error: "Booking not found." });
    }

    await run("BEGIN TRANSACTION");

    for (const seat of seats) {
      await run("UPDATE seats SET is_booked = 0 WHERE seat_number = ?", [seat.seat_number]);
    }

    await run("DELETE FROM booking_seats WHERE booking_id = ?", [bookingId]);
    await run("DELETE FROM bookings WHERE booking_id = ?", [bookingId]);

    await run("COMMIT");

    return res.json({
      message: "Booking canceled successfully.",
      releasedSeats: seats.map((seat) => seat.seat_number),
    });
  } catch (error) {
    try {
      await run("ROLLBACK");
    } catch (_rollbackError) {
      // Ignore rollback failures.
    }
    return res.status(500).json({ error: "Failed to cancel booking." });
  }
});

async function startServer() {
  await initializeDb();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
