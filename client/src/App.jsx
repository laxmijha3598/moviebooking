import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function App() {
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [lastBookingId, setLastBookingId] = useState("");
  const [cancelBookingId, setCancelBookingId] = useState("");
  const [stats, setStats] = useState({ totalSeats: 20, availableSeats: 20, bookedSeats: 0 });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadSeats() {
    const res = await fetch(`${API_BASE_URL}/seats`);
    if (!res.ok) {
      throw new Error("Could not load seats.");
    }
    const data = await res.json();
    setSeats(data.seats);
    setStats({
      totalSeats: data.totalSeats,
      availableSeats: data.availableSeats,
      bookedSeats: data.bookedSeats,
    });
  }

  useEffect(() => {
    loadSeats().catch((err) => setError(err.message));
  }, []);

  const allSeatsBooked = useMemo(() => stats.availableSeats === 0, [stats.availableSeats]);

  function toggleSeatSelection(seatNumber, isBooked) {
    if (isBooked) return;
    setSelectedSeats((prev) =>
      prev.includes(seatNumber) ? prev.filter((seat) => seat !== seatNumber) : [...prev, seatNumber]
    );
  }

  async function handleBookSeats() {
    setError("");
    setMessage("");
    if (selectedSeats.length === 0) {
      setError("Please select at least one seat to book.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatNumbers: selectedSeats }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Booking failed.");
      }
      setMessage(`Booking successful. Booking ID: ${data.bookingId}`);
      setLastBookingId(data.bookingId);
      setCancelBookingId(data.bookingId);
      setSelectedSeats([]);
      await loadSeats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBooking() {
    setError("");
    setMessage("");
    if (!cancelBookingId.trim()) {
      setError("Please enter a booking ID to cancel.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${cancelBookingId.trim()}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cancellation failed.");
      }
      setMessage(`Booking canceled. Released seats: ${data.releasedSeats.join(", ")}`);
      setCancelBookingId("");
      setLastBookingId("");
      await loadSeats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Movie Ticket Booking System</h1>
      <p className="subtitle">Total seats per show: {stats.totalSeats}</p>

      <div className="stats">
        <div>Available: {stats.availableSeats}</div>
        <div>Booked: {stats.bookedSeats}</div>
      </div>

      {allSeatsBooked && <p className="warning">All seats are booked. New bookings are disabled.</p>}

      <div className="seat-grid">
        {seats.map((seat) => {
          const isSelected = selectedSeats.includes(seat.seatNumber);
          return (
            <button
              key={seat.seatNumber}
              type="button"
              disabled={seat.isBooked || loading}
              className={`seat ${seat.isBooked ? "booked" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => toggleSeatSelection(seat.seatNumber, seat.isBooked)}
            >
              {seat.seatNumber}
            </button>
          );
        })}
      </div>

      <div className="actions">
        <button
          type="button"
          onClick={handleBookSeats}
          disabled={loading || allSeatsBooked || selectedSeats.length === 0}
        >
          Book Selected Seats
        </button>
      </div>

      <div className="cancel-panel">
        <input
          type="text"
          placeholder="Enter booking ID to cancel"
          value={cancelBookingId}
          onChange={(e) => setCancelBookingId(e.target.value)}
          disabled={loading}
        />
        <button type="button" onClick={handleCancelBooking} disabled={loading}>
          Cancel Booking
        </button>
      </div>

      {lastBookingId && <p className="hint">Tip: Use this booking ID for cancellation: {lastBookingId}</p>}
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default App;
