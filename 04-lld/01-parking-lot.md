# LLD 01: Parking Lot

> **Difficulty**: Easy
> **Key Concepts**: OOP, Strategy pattern, enums, class design

---

## 1. Requirements

- Multi-floor parking lot with different spot sizes (small, medium, large)
- Vehicle types: motorcycle, car, truck
- Assign the nearest available spot matching vehicle size
- Track entry/exit, calculate parking fee (hourly rate)
- Display available spots per floor
- Support multiple entry/exit points

---

## 2. Core Classes

```java
public enum VehicleType {
    MOTORCYCLE(1), CAR(2), TRUCK(3);
    private final int value;
    VehicleType(int value) { this.value = value; }
    public int getValue() { return value; }
}

public enum SpotSize {
    SMALL(1),    // motorcycle
    MEDIUM(2),   // car
    LARGE(3);    // truck
    private final int value;
    SpotSize(int value) { this.value = value; }
    public int getValue() { return value; }
}

public class Vehicle {
    private final String licensePlate;
    private final VehicleType vehicleType;

    public Vehicle(String licensePlate, VehicleType vehicleType) {
        this.licensePlate = licensePlate;
        this.vehicleType = vehicleType;
    }
    public String getLicensePlate() { return licensePlate; }
    public VehicleType getVehicleType() { return vehicleType; }
}

public class ParkingSpot {
    private final String spotId;
    private final int floor;
    private final SpotSize size;
    private Vehicle vehicle; // null = available

    private static final Map<VehicleType, SpotSize> SIZE_MAP = Map.of(
        VehicleType.MOTORCYCLE, SpotSize.SMALL,
        VehicleType.CAR, SpotSize.MEDIUM,
        VehicleType.TRUCK, SpotSize.LARGE
    );

    public ParkingSpot(String spotId, int floor, SpotSize size) {
        this.spotId = spotId;
        this.floor = floor;
        this.size = size;
    }

    public boolean isAvailable() { return vehicle == null; }

    public boolean canFit(Vehicle vehicle) {
        SpotSize required = SIZE_MAP.get(vehicle.getVehicleType());
        return isAvailable() && this.size.getValue() >= required.getValue();
    }

    public void park(Vehicle vehicle) {
        if (!canFit(vehicle)) throw new RuntimeException("Cannot park here");
        this.vehicle = vehicle;
    }

    public Vehicle removeVehicle() {
        Vehicle v = this.vehicle;
        this.vehicle = null;
        return v;
    }

    public String getSpotId() { return spotId; }
    public int getFloor() { return floor; }
    public SpotSize getSize() { return size; }
    public Vehicle getVehicle() { return vehicle; }
}
```

---

## 3. Parking Lot & Floor

```java
public class ParkingFloor {
    private final int floorNumber;
    private final List<ParkingSpot> spots;

    public ParkingFloor(int floorNumber, List<ParkingSpot> spots) {
        this.floorNumber = floorNumber;
        this.spots = spots;
    }

    public ParkingSpot findAvailableSpot(Vehicle vehicle) {
        for (ParkingSpot spot : spots) {
            if (spot.canFit(vehicle)) return spot;
        }
        return null;
    }

    public Map<SpotSize, Integer> availableCount() {
        Map<SpotSize, Integer> counts = new EnumMap<>(SpotSize.class);
        for (SpotSize size : SpotSize.values()) counts.put(size, 0);
        for (ParkingSpot spot : spots) {
            if (spot.isAvailable()) counts.merge(spot.getSize(), 1, Integer::sum);
        }
        return counts;
    }
}

public class ParkingLot {
    private static ParkingLot instance; // Singleton
    private final String name;
    private final List<ParkingFloor> floors;
    private final Map<String, ParkingTicket> activeTickets = new HashMap<>();

    private ParkingLot(String name, List<ParkingFloor> floors) {
        this.name = name;
        this.floors = floors;
    }

    public static synchronized ParkingLot getInstance(String name, List<ParkingFloor> floors) {
        if (instance == null) instance = new ParkingLot(name, floors);
        return instance;
    }

    public ParkingSpot findSpot(Vehicle vehicle) {
        for (ParkingFloor floor : floors) {
            ParkingSpot spot = floor.findAvailableSpot(vehicle);
            if (spot != null) return spot;
        }
        return null;
    }

    public ParkingTicket parkVehicle(Vehicle vehicle) {
        ParkingSpot spot = findSpot(vehicle);
        if (spot == null) throw new RuntimeException("Parking lot is full");
        spot.park(vehicle);
        ParkingTicket ticket = new ParkingTicket(vehicle, spot);
        activeTickets.put(ticket.getTicketId(), ticket);
        return ticket;
    }

    public double unparkVehicle(String ticketId, PaymentStrategy paymentStrategy) {
        ParkingTicket ticket = activeTickets.remove(ticketId);
        ticket.setExitTime();
        double fee = paymentStrategy.calculateFee(ticket);
        ticket.getSpot().removeVehicle();
        return fee;
    }
}
```

---

## 4. Ticket & Payment (Strategy Pattern)

```java
public class ParkingTicket {
    private final String ticketId;
    private final Vehicle vehicle;
    private final ParkingSpot spot;
    private final LocalDateTime entryTime;
    private LocalDateTime exitTime;

    public ParkingTicket(Vehicle vehicle, ParkingSpot spot) {
        this.ticketId = UUID.randomUUID().toString();
        this.vehicle = vehicle;
        this.spot = spot;
        this.entryTime = LocalDateTime.now();
    }

    public void setExitTime() { this.exitTime = LocalDateTime.now(); }

    public double parkedHours() {
        LocalDateTime end = (exitTime != null) ? exitTime : LocalDateTime.now();
        long seconds = java.time.Duration.between(entryTime, end).getSeconds();
        return Math.max(1, seconds / 3600.0); // minimum 1 hour
    }

    public String getTicketId() { return ticketId; }
    public Vehicle getVehicle() { return vehicle; }
    public ParkingSpot getSpot() { return spot; }
}

public interface PaymentStrategy {
    double calculateFee(ParkingTicket ticket);
}

public class HourlyPayment implements PaymentStrategy {
    private static final Map<SpotSize, Double> RATES = Map.of(
        SpotSize.SMALL, 2.0,
        SpotSize.MEDIUM, 5.0,
        SpotSize.LARGE, 10.0
    );

    @Override
    public double calculateFee(ParkingTicket ticket) {
        double rate = RATES.get(ticket.getSpot().getSize());
        return Math.round(rate * ticket.parkedHours() * 100.0) / 100.0;
    }
}

public class FlatRatePayment implements PaymentStrategy {
    private final double flatRate;

    public FlatRatePayment() { this(20.0); }
    public FlatRatePayment(double flatRate) { this.flatRate = flatRate; }

    @Override
    public double calculateFee(ParkingTicket ticket) { return flatRate; }
}
```

---

## 5. Sequence Flow

```
1. Vehicle arrives at entry gate
2. ParkingLot.park_vehicle(vehicle)
   a. find_spot(vehicle) → iterates floors → finds first available matching spot
   b. spot.park(vehicle) → assigns vehicle to spot
   c. Create ParkingTicket → return to driver
3. Vehicle exits
4. ParkingLot.unpark_vehicle(ticket_id, HourlyPayment())
   a. Look up ticket
   b. Set exit time
   c. Calculate fee using payment strategy
   d. spot.remove_vehicle() → spot is now available
   e. Return fee amount
```

---

## 6. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Singleton** | ParkingLot | Only one parking lot instance |
| **Strategy** | PaymentStrategy | Swap hourly/flat/discount pricing |
| **Enum** | VehicleType, SpotSize | Type-safe constants |

---

## 7. Edge Cases

- **Full lot**: `find_spot()` returns None → raise exception or add to waitlist
- **Invalid unpark**: Ticket ID not found → raise error
- **Concurrent entry**: Thread-safe spot assignment (lock per floor or per spot)
- **Overstay**: Apply penalty rate after max hours
- **Electric vehicles**: Add `SpotSize.EV` with charging capability

> **Next**: [02 — Elevator System](02-elevator-system.md)
