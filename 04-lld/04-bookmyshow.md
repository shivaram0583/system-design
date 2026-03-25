# LLD 04: BookMyShow (Movie Ticket Booking)

> **Difficulty**: Medium
> **Key Concepts**: Seat locking, concurrency, state machine, payment

---

## 1. Requirements

- Browse movies by city, cinema, showtime
- View seat map (available, booked, locked)
- Select seats and temporarily lock them
- Complete booking with payment
- Cancel booking and refund
- Multiple cinemas, screens, and showtimes

---

## 2. Core Classes

```python
from enum import Enum
from datetime import datetime, timedelta
import uuid
import threading

class SeatStatus(Enum):
    AVAILABLE = 1
    LOCKED = 2
    BOOKED = 3

class SeatType(Enum):
    REGULAR = 1
    PREMIUM = 2
    VIP = 3

class BookingStatus(Enum):
    PENDING = 1
    CONFIRMED = 2
    CANCELLED = 3
    EXPIRED = 4

class Movie:
    def __init__(self, movie_id: str, title: str, duration_min: int, genre: str):
        self.movie_id = movie_id
        self.title = title
        self.duration_min = duration_min
        self.genre = genre

class Cinema:
    def __init__(self, cinema_id: str, name: str, city: str):
        self.cinema_id = cinema_id
        self.name = name
        self.city = city
        self.screens: list["Screen"] = []

class Screen:
    def __init__(self, screen_id: str, cinema: Cinema, name: str):
        self.screen_id = screen_id
        self.cinema = cinema
        self.name = name
        self.seats: list["Seat"] = []

class Seat:
    def __init__(self, seat_id: str, row: str, number: int, seat_type: SeatType):
        self.seat_id = seat_id
        self.row = row
        self.number = number
        self.seat_type = seat_type

class Show:
    def __init__(self, show_id: str, movie: Movie, screen: Screen, start_time: datetime):
        self.show_id = show_id
        self.movie = movie
        self.screen = screen
        self.start_time = start_time
        self.seat_statuses: dict[str, SeatStatus] = {}  # seat_id -> status
        self.prices: dict[SeatType, float] = {}
        self.lock = threading.Lock()

        # Initialize all seats as available
        for seat in screen.seats:
            self.seat_statuses[seat.seat_id] = SeatStatus.AVAILABLE

    def get_available_seats(self) -> list[Seat]:
        return [s for s in self.screen.seats
                if self.seat_statuses[s.seat_id] == SeatStatus.AVAILABLE]
```

---

## 3. Booking System

```python
class Booking:
    def __init__(self, user_id: str, show: Show, seats: list[Seat]):
        self.booking_id = str(uuid.uuid4())
        self.user_id = user_id
        self.show = show
        self.seats = seats
        self.status = BookingStatus.PENDING
        self.total_amount = sum(show.prices.get(s.seat_type, 0) for s in seats)
        self.created_at = datetime.now()
        self.lock_expires_at = datetime.now() + timedelta(minutes=7)


class BookingService:
    def __init__(self):
        self.bookings: dict[str, Booking] = {}
        self.lock = threading.Lock()

    def lock_seats(self, user_id: str, show: Show, seat_ids: list[str]) -> Booking:
        """Lock selected seats for 7 minutes."""
        with show.lock:
            # Verify all seats are available
            for seat_id in seat_ids:
                if show.seat_statuses.get(seat_id) != SeatStatus.AVAILABLE:
                    raise Exception(f"Seat {seat_id} is not available")

            # Lock all seats atomically
            seats = []
            for seat in show.screen.seats:
                if seat.seat_id in seat_ids:
                    show.seat_statuses[seat.seat_id] = SeatStatus.LOCKED
                    seats.append(seat)

            booking = Booking(user_id, show, seats)
            self.bookings[booking.booking_id] = booking
            return booking

    def confirm_booking(self, booking_id: str, payment_confirmed: bool) -> Booking:
        """Confirm booking after payment."""
        booking = self.bookings.get(booking_id)
        if not booking:
            raise Exception("Booking not found")

        if booking.status != BookingStatus.PENDING:
            raise Exception(f"Booking is {booking.status.name}")

        if datetime.now() > booking.lock_expires_at:
            self._release_seats(booking)
            booking.status = BookingStatus.EXPIRED
            raise Exception("Booking expired — seats released")

        if payment_confirmed:
            with booking.show.lock:
                for seat in booking.seats:
                    booking.show.seat_statuses[seat.seat_id] = SeatStatus.BOOKED
            booking.status = BookingStatus.CONFIRMED
        else:
            self._release_seats(booking)
            booking.status = BookingStatus.CANCELLED

        return booking

    def cancel_booking(self, booking_id: str) -> float:
        """Cancel a confirmed booking, return refund amount."""
        booking = self.bookings.get(booking_id)
        if not booking or booking.status != BookingStatus.CONFIRMED:
            raise Exception("Cannot cancel this booking")

        self._release_seats(booking)
        booking.status = BookingStatus.CANCELLED

        # Refund policy: full if > 2 hours before show, 50% otherwise
        time_to_show = (booking.show.start_time - datetime.now()).total_seconds() / 3600
        if time_to_show > 2:
            return booking.total_amount
        return booking.total_amount * 0.5

    def _release_seats(self, booking: Booking):
        with booking.show.lock:
            for seat in booking.seats:
                booking.show.seat_statuses[seat.seat_id] = SeatStatus.AVAILABLE

    def cleanup_expired_locks(self):
        """Run periodically to release expired seat locks."""
        for booking in list(self.bookings.values()):
            if (booking.status == BookingStatus.PENDING and
                datetime.now() > booking.lock_expires_at):
                self._release_seats(booking)
                booking.status = BookingStatus.EXPIRED
```

---

## 4. Search Service

```python
class MovieSearchService:
    def __init__(self):
        self.shows: list[Show] = []

    def search_by_city(self, city: str) -> list[Show]:
        return [s for s in self.shows if s.screen.cinema.city == city]

    def search_by_movie(self, movie_id: str, city: str) -> list[Show]:
        return [s for s in self.shows
                if s.movie.movie_id == movie_id and s.screen.cinema.city == city]

    def search_by_cinema(self, cinema_id: str) -> list[Show]:
        return [s for s in self.shows if s.screen.cinema.cinema_id == cinema_id]
```

---

## 5. Sequence Flow

```
1. User searches: movies in "Mumbai" → list of shows
2. User selects show → view seat map (available/booked)
3. User selects seats [A1, A2] → BookingService.lock_seats()
   - Atomically check + lock (show.lock ensures no race condition)
   - Returns Booking with 7-minute expiry
4. User proceeds to payment (within 7 min)
5. Payment success → BookingService.confirm_booking()
   - Seats marked BOOKED permanently
6. Payment fail / timeout → seats auto-released (cleanup job)
```

---

## 6. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **State Machine** | SeatStatus, BookingStatus | Model seat/booking lifecycle |
| **Mutex/Lock** | show.lock | Prevent race conditions on seat selection |
| **Repository** | BookingService | Centralized booking management |
| **Strategy** | Refund policy (extensible) | Different refund rules per cinema |

---

## 7. Edge Cases

- **Concurrent seat selection**: Lock ensures atomicity; second user gets error
- **Payment timeout**: Cleanup job releases seats after 7 min
- **Double payment**: Idempotency check on booking_id
- **Show cancelled**: Notify all bookers, issue full refunds
- **Seat map refresh**: Poll or WebSocket to show real-time updates

> **Next**: [05 — ATM](05-atm.md)
