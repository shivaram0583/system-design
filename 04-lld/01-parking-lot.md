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

```python
from enum import Enum
from datetime import datetime
from abc import ABC, abstractmethod

class VehicleType(Enum):
    MOTORCYCLE = 1
    CAR = 2
    TRUCK = 3

class SpotSize(Enum):
    SMALL = 1      # motorcycle
    MEDIUM = 2     # car
    LARGE = 3      # truck

class Vehicle:
    def __init__(self, license_plate: str, vehicle_type: VehicleType):
        self.license_plate = license_plate
        self.vehicle_type = vehicle_type

class ParkingSpot:
    def __init__(self, spot_id: str, floor: int, size: SpotSize):
        self.spot_id = spot_id
        self.floor = floor
        self.size = size
        self.vehicle = None  # None = available

    def is_available(self) -> bool:
        return self.vehicle is None

    def can_fit(self, vehicle: Vehicle) -> bool:
        size_map = {
            VehicleType.MOTORCYCLE: SpotSize.SMALL,
            VehicleType.CAR: SpotSize.MEDIUM,
            VehicleType.TRUCK: SpotSize.LARGE,
        }
        return self.is_available() and self.size.value >= size_map[vehicle.vehicle_type].value

    def park(self, vehicle: Vehicle):
        if not self.can_fit(vehicle):
            raise Exception("Cannot park here")
        self.vehicle = vehicle

    def remove_vehicle(self) -> Vehicle:
        vehicle = self.vehicle
        self.vehicle = None
        return vehicle
```

---

## 3. Parking Lot & Floor

```python
class ParkingFloor:
    def __init__(self, floor_number: int, spots: list[ParkingSpot]):
        self.floor_number = floor_number
        self.spots = spots

    def find_available_spot(self, vehicle: Vehicle) -> ParkingSpot | None:
        for spot in self.spots:
            if spot.can_fit(vehicle):
                return spot
        return None

    def available_count(self) -> dict:
        counts = {size: 0 for size in SpotSize}
        for spot in self.spots:
            if spot.is_available():
                counts[spot.size] += 1
        return counts


class ParkingLot:
    _instance = None  # Singleton

    def __init__(self, name: str, floors: list[ParkingFloor]):
        self.name = name
        self.floors = floors
        self.active_tickets = {}  # ticket_id -> ParkingTicket

    @classmethod
    def get_instance(cls, name="Main Lot", floors=None):
        if cls._instance is None:
            cls._instance = cls(name, floors or [])
        return cls._instance

    def find_spot(self, vehicle: Vehicle) -> ParkingSpot | None:
        for floor in self.floors:
            spot = floor.find_available_spot(vehicle)
            if spot:
                return spot
        return None

    def park_vehicle(self, vehicle: Vehicle) -> "ParkingTicket":
        spot = self.find_spot(vehicle)
        if not spot:
            raise Exception("Parking lot is full")
        spot.park(vehicle)
        ticket = ParkingTicket(vehicle, spot)
        self.active_tickets[ticket.ticket_id] = ticket
        return ticket

    def unpark_vehicle(self, ticket_id: str, payment_strategy: "PaymentStrategy") -> float:
        ticket = self.active_tickets.pop(ticket_id)
        ticket.set_exit_time()
        fee = payment_strategy.calculate_fee(ticket)
        ticket.spot.remove_vehicle()
        return fee
```

---

## 4. Ticket & Payment (Strategy Pattern)

```python
import uuid

class ParkingTicket:
    def __init__(self, vehicle: Vehicle, spot: ParkingSpot):
        self.ticket_id = str(uuid.uuid4())
        self.vehicle = vehicle
        self.spot = spot
        self.entry_time = datetime.now()
        self.exit_time = None

    def set_exit_time(self):
        self.exit_time = datetime.now()

    def parked_hours(self) -> float:
        delta = (self.exit_time or datetime.now()) - self.entry_time
        return max(1, delta.total_seconds() / 3600)  # minimum 1 hour


class PaymentStrategy(ABC):
    @abstractmethod
    def calculate_fee(self, ticket: ParkingTicket) -> float:
        pass

class HourlyPayment(PaymentStrategy):
    RATES = {
        SpotSize.SMALL: 2.0,
        SpotSize.MEDIUM: 5.0,
        SpotSize.LARGE: 10.0,
    }

    def calculate_fee(self, ticket: ParkingTicket) -> float:
        rate = self.RATES[ticket.spot.size]
        return round(rate * ticket.parked_hours(), 2)

class FlatRatePayment(PaymentStrategy):
    def __init__(self, flat_rate: float = 20.0):
        self.flat_rate = flat_rate

    def calculate_fee(self, ticket: ParkingTicket) -> float:
        return self.flat_rate
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
