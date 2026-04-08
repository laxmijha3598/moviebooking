# Movie Ticket Booking System

Simple full-stack assignment project using **Node.js + React + SQL (SQLite)**.

## Features

- View available seats for a single movie show
- Book tickets for multiple seats in one request
- Cancel booking using booking ID
- Prevent bookings when seats are already booked
- Total seats fixed at 20

## Project Structure

- `server` - Express API + SQLite database
- `client` - React app (Vite)

## Setup and Run

### 1) Start backend

```bash
cd server
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2) Start frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints

- `GET /api/seats` - Returns all seats and availability stats
- `POST /api/bookings` - Books seats
  - Body: `{ "seatNumbers": [1, 2, 3] }`
- `DELETE /api/bookings/:bookingId` - Cancels a booking and releases seats

## Notes

- Booking ID is generated on successful booking and shown in UI.
- Store it to cancel booking later.
