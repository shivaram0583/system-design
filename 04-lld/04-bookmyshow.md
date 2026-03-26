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

```java
public enum SeatStatus { AVAILABLE, LOCKED, BOOKED }
public enum SeatType { REGULAR, PREMIUM, VIP }
public enum BookingStatus { PENDING, CONFIRMED, CANCELLED, EXPIRED }

public class Movie {
    private final String movieId;
    private final String title;
    private final int durationMin;
    private final String genre;

    public Movie(String movieId, String title, int durationMin, String genre) {
        this.movieId = movieId; this.title = title;
        this.durationMin = durationMin; this.genre = genre;
    }
    public String getMovieId() { return movieId; }
    public String getTitle() { return title; }
}

public class Cinema {
    private final String cinemaId;
    private final String name;
    private final String city;
    private final List<Screen> screens = new ArrayList<>();

    public Cinema(String cinemaId, String name, String city) {
        this.cinemaId = cinemaId; this.name = name; this.city = city;
    }
    public String getCinemaId() { return cinemaId; }
    public String getCity() { return city; }
    public List<Screen> getScreens() { return screens; }
}

public class Screen {
    private final String screenId;
    private final Cinema cinema;
    private final String name;
    private final List<Seat> seats = new ArrayList<>();

    public Screen(String screenId, Cinema cinema, String name) {
        this.screenId = screenId; this.cinema = cinema; this.name = name;
    }
    public Cinema getCinema() { return cinema; }
    public List<Seat> getSeats() { return seats; }
}

public class Seat {
    private final String seatId;
    private final String row;
    private final int number;
    private final SeatType seatType;

    public Seat(String seatId, String row, int number, SeatType seatType) {
        this.seatId = seatId; this.row = row;
        this.number = number; this.seatType = seatType;
    }
    public String getSeatId() { return seatId; }
    public SeatType getSeatType() { return seatType; }
}

public class Show {
    private final String showId;
    private final Movie movie;
    private final Screen screen;
    private final LocalDateTime startTime;
    private final Map<String, SeatStatus> seatStatuses = new HashMap<>();
    private final Map<SeatType, Double> prices = new EnumMap<>(SeatType.class);
    private final Object lock = new Object();

    public Show(String showId, Movie movie, Screen screen, LocalDateTime startTime) {
        this.showId = showId; this.movie = movie;
        this.screen = screen; this.startTime = startTime;
        for (Seat seat : screen.getSeats())
            seatStatuses.put(seat.getSeatId(), SeatStatus.AVAILABLE);
    }

    public List<Seat> getAvailableSeats() {
        return screen.getSeats().stream()
            .filter(s -> seatStatuses.get(s.getSeatId()) == SeatStatus.AVAILABLE)
            .collect(Collectors.toList());
    }

    public Movie getMovie() { return movie; }
    public Screen getScreen() { return screen; }
    public LocalDateTime getStartTime() { return startTime; }
    public Map<String, SeatStatus> getSeatStatuses() { return seatStatuses; }
    public Map<SeatType, Double> getPrices() { return prices; }
    public Object getLock() { return lock; }
}
```

---

## 3. Booking System

```java
public class Booking {
    private final String bookingId;
    private final String userId;
    private final Show show;
    private final List<Seat> seats;
    private BookingStatus status = BookingStatus.PENDING;
    private final double totalAmount;
    private final LocalDateTime createdAt;
    private final LocalDateTime lockExpiresAt;

    public Booking(String userId, Show show, List<Seat> seats) {
        this.bookingId = UUID.randomUUID().toString();
        this.userId = userId;
        this.show = show;
        this.seats = seats;
        this.totalAmount = seats.stream()
            .mapToDouble(s -> show.getPrices().getOrDefault(s.getSeatType(), 0.0)).sum();
        this.createdAt = LocalDateTime.now();
        this.lockExpiresAt = LocalDateTime.now().plusMinutes(7);
    }

    public String getBookingId() { return bookingId; }
    public Show getShow() { return show; }
    public List<Seat> getSeats() { return seats; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public double getTotalAmount() { return totalAmount; }
    public LocalDateTime getLockExpiresAt() { return lockExpiresAt; }
}

public class BookingService {
    private final Map<String, Booking> bookings = new HashMap<>();

    public Booking lockSeats(String userId, Show show, List<String> seatIds) {
        synchronized (show.getLock()) {
            for (String seatId : seatIds) {
                if (show.getSeatStatuses().get(seatId) != SeatStatus.AVAILABLE)
                    throw new RuntimeException("Seat " + seatId + " is not available");
            }
            List<Seat> seats = show.getScreen().getSeats().stream()
                .filter(s -> seatIds.contains(s.getSeatId())).collect(Collectors.toList());
            seats.forEach(s -> show.getSeatStatuses().put(s.getSeatId(), SeatStatus.LOCKED));
            Booking booking = new Booking(userId, show, seats);
            bookings.put(booking.getBookingId(), booking);
            return booking;
        }
    }

    public Booking confirmBooking(String bookingId, boolean paymentConfirmed) {
        Booking booking = bookings.get(bookingId);
        if (booking == null) throw new RuntimeException("Booking not found");
        if (booking.getStatus() != BookingStatus.PENDING)
            throw new RuntimeException("Booking is " + booking.getStatus());

        if (LocalDateTime.now().isAfter(booking.getLockExpiresAt())) {
            releaseSeats(booking);
            booking.setStatus(BookingStatus.EXPIRED);
            throw new RuntimeException("Booking expired - seats released");
        }

        if (paymentConfirmed) {
            synchronized (booking.getShow().getLock()) {
                booking.getSeats().forEach(s ->
                    booking.getShow().getSeatStatuses().put(s.getSeatId(), SeatStatus.BOOKED));
            }
            booking.setStatus(BookingStatus.CONFIRMED);
        } else {
            releaseSeats(booking);
            booking.setStatus(BookingStatus.CANCELLED);
        }
        return booking;
    }

    public double cancelBooking(String bookingId) {
        Booking booking = bookings.get(bookingId);
        if (booking == null || booking.getStatus() != BookingStatus.CONFIRMED)
            throw new RuntimeException("Cannot cancel this booking");
        releaseSeats(booking);
        booking.setStatus(BookingStatus.CANCELLED);
        long hoursToShow = java.time.Duration.between(
            LocalDateTime.now(), booking.getShow().getStartTime()).toHours();
        return (hoursToShow > 2) ? booking.getTotalAmount() : booking.getTotalAmount() * 0.5;
    }

    private void releaseSeats(Booking booking) {
        synchronized (booking.getShow().getLock()) {
            booking.getSeats().forEach(s ->
                booking.getShow().getSeatStatuses().put(s.getSeatId(), SeatStatus.AVAILABLE));
        }
    }

    public void cleanupExpiredLocks() {
        for (Booking booking : new ArrayList<>(bookings.values())) {
            if (booking.getStatus() == BookingStatus.PENDING
                    && LocalDateTime.now().isAfter(booking.getLockExpiresAt())) {
                releaseSeats(booking);
                booking.setStatus(BookingStatus.EXPIRED);
            }
        }
    }
}
```

---

## 4. Search Service

```java
public class MovieSearchService {
    private final List<Show> shows = new ArrayList<>();

    public List<Show> searchByCity(String city) {
        return shows.stream()
            .filter(s -> s.getScreen().getCinema().getCity().equals(city))
            .collect(Collectors.toList());
    }

    public List<Show> searchByMovie(String movieId, String city) {
        return shows.stream()
            .filter(s -> s.getMovie().getMovieId().equals(movieId)
                      && s.getScreen().getCinema().getCity().equals(city))
            .collect(Collectors.toList());
    }

    public List<Show> searchByCinema(String cinemaId) {
        return shows.stream()
            .filter(s -> s.getScreen().getCinema().getCinemaId().equals(cinemaId))
            .collect(Collectors.toList());
    }

    public void addShow(Show show) { shows.add(show); }
}
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
