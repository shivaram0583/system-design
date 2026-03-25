# LLD 02: Elevator System

> **Difficulty**: Medium
> **Key Concepts**: State machine, scheduling algorithms, concurrency

---

## 1. Requirements

- Building with N floors and M elevators
- Users press UP/DOWN button on a floor, then select destination floor inside
- Elevator scheduling: minimize wait time
- Handle concurrent requests from multiple floors
- Display current floor and direction for each elevator

---

## 2. Core Classes

```python
from enum import Enum
from threading import Lock
import heapq

class Direction(Enum):
    UP = 1
    DOWN = -1
    IDLE = 0

class ElevatorState(Enum):
    MOVING = 1
    STOPPED = 2
    MAINTENANCE = 3

class Request:
    def __init__(self, floor: int, direction: Direction):
        self.floor = floor
        self.direction = direction

class Elevator:
    def __init__(self, elevator_id: int, capacity: int = 10):
        self.id = elevator_id
        self.current_floor = 0
        self.direction = Direction.IDLE
        self.state = ElevatorState.STOPPED
        self.capacity = capacity
        self.destinations = set()  # floors to stop at
        self.lock = Lock()

    def add_destination(self, floor: int):
        with self.lock:
            self.destinations.add(floor)
            self._update_direction()

    def _update_direction(self):
        if not self.destinations:
            self.direction = Direction.IDLE
            return
        if all(f > self.current_floor for f in self.destinations):
            self.direction = Direction.UP
        elif all(f < self.current_floor for f in self.destinations):
            self.direction = Direction.DOWN

    def move(self):
        """Simulate one step of movement."""
        with self.lock:
            if self.direction == Direction.UP:
                self.current_floor += 1
            elif self.direction == Direction.DOWN:
                self.current_floor -= 1

            if self.current_floor in self.destinations:
                self.destinations.remove(self.current_floor)
                self.state = ElevatorState.STOPPED
                # Open doors, let people in/out
                self._update_direction()
            else:
                self.state = ElevatorState.MOVING

    def is_idle(self) -> bool:
        return self.direction == Direction.IDLE
```

---

## 3. Scheduling Strategy

```python
from abc import ABC, abstractmethod

class SchedulingStrategy(ABC):
    @abstractmethod
    def select_elevator(self, elevators: list[Elevator], request: Request) -> Elevator:
        pass

class LookScheduling(SchedulingStrategy):
    """LOOK algorithm (elevator scan) — most common real-world strategy."""

    def select_elevator(self, elevators: list[Elevator], request: Request) -> Elevator:
        best = None
        best_score = float('inf')

        for elevator in elevators:
            score = self._calculate_score(elevator, request)
            if score < best_score:
                best_score = score
                best = elevator
        return best

    def _calculate_score(self, elevator: Elevator, request: Request) -> int:
        distance = abs(elevator.current_floor - request.floor)

        # Idle elevator: just distance
        if elevator.is_idle():
            return distance

        # Moving toward request in same direction: best case
        if (elevator.direction == Direction.UP and
            elevator.current_floor <= request.floor and
            request.direction == Direction.UP):
            return distance

        if (elevator.direction == Direction.DOWN and
            elevator.current_floor >= request.floor and
            request.direction == Direction.DOWN):
            return distance

        # Moving away: penalize (will need to reverse)
        return distance + 1000


class NearestElevator(SchedulingStrategy):
    """Simple: pick the closest idle or same-direction elevator."""

    def select_elevator(self, elevators: list[Elevator], request: Request) -> Elevator:
        idle = [e for e in elevators if e.is_idle()]
        if idle:
            return min(idle, key=lambda e: abs(e.current_floor - request.floor))
        return min(elevators, key=lambda e: abs(e.current_floor - request.floor))
```

---

## 4. Elevator Controller

```python
class ElevatorController:
    def __init__(self, elevators: list[Elevator], strategy: SchedulingStrategy):
        self.elevators = elevators
        self.strategy = strategy
        self.pending_requests = []

    def request_elevator(self, floor: int, direction: Direction):
        """External request: user presses UP/DOWN on a floor."""
        request = Request(floor, direction)
        elevator = self.strategy.select_elevator(self.elevators, request)
        elevator.add_destination(floor)
        return elevator.id

    def select_floor(self, elevator_id: int, floor: int):
        """Internal request: user presses floor button inside elevator."""
        elevator = self._get_elevator(elevator_id)
        elevator.add_destination(floor)

    def step(self):
        """Advance all elevators by one step (called by simulation loop)."""
        for elevator in self.elevators:
            elevator.move()

    def _get_elevator(self, elevator_id: int) -> Elevator:
        for e in self.elevators:
            if e.id == elevator_id:
                return e
        raise ValueError(f"Elevator {elevator_id} not found")
```

---

## 5. Sequence Flow

```
1. User on floor 5 presses UP button
2. ElevatorController.request_elevator(floor=5, direction=UP)
3. SchedulingStrategy selects best elevator (e.g., Elevator #2 on floor 3, going UP)
4. Elevator #2 adds floor 5 to destinations
5. Elevator #2 moves: 3 → 4 → 5 (stops, opens doors)
6. User enters, presses floor 10: select_floor(elevator_id=2, floor=10)
7. Elevator #2 adds floor 10 to destinations
8. Elevator #2 moves: 5 → 6 → ... → 10 (stops, opens doors)
```

---

## 6. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Strategy** | SchedulingStrategy | Swap LOOK/Nearest/FCFS algorithms |
| **State Machine** | ElevatorState + Direction | Model elevator behavior |
| **Observer** | Display panel (optional) | Notify floor displays of position changes |
| **Singleton** | ElevatorController | One controller per building |

---

## 7. Edge Cases

- **All elevators busy**: Queue request, assign when one becomes idle
- **Opposite directions**: Elevator going UP, user wants DOWN → skip, assign another
- **Maintenance mode**: Remove elevator from scheduling pool
- **Overweight**: Check capacity before allowing more passengers
- **Peak hours**: Pre-position elevators at lobby floors during morning rush

> **Next**: [03 — Library Management](03-library-management.md)
