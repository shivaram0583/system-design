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

```java
public enum Direction { UP, DOWN, IDLE }

public enum ElevatorState { MOVING, STOPPED, MAINTENANCE }

public class Request {
    private final int floor;
    private final Direction direction;

    public Request(int floor, Direction direction) {
        this.floor = floor;
        this.direction = direction;
    }
    public int getFloor() { return floor; }
    public Direction getDirection() { return direction; }
}

public class Elevator {
    private final int id;
    private int currentFloor = 0;
    private Direction direction = Direction.IDLE;
    private ElevatorState state = ElevatorState.STOPPED;
    private final int capacity;
    private final Set<Integer> destinations = new HashSet<>();
    private final Object lock = new Object();

    public Elevator(int id, int capacity) {
        this.id = id;
        this.capacity = capacity;
    }

    public void addDestination(int floor) {
        synchronized (lock) {
            destinations.add(floor);
            updateDirection();
        }
    }

    private void updateDirection() {
        if (destinations.isEmpty()) { direction = Direction.IDLE; return; }
        if (destinations.stream().allMatch(f -> f > currentFloor)) direction = Direction.UP;
        else if (destinations.stream().allMatch(f -> f < currentFloor)) direction = Direction.DOWN;
    }

    public void move() {
        synchronized (lock) {
            if (direction == Direction.UP) currentFloor++;
            else if (direction == Direction.DOWN) currentFloor--;

            if (destinations.remove(currentFloor)) {
                state = ElevatorState.STOPPED;
                updateDirection();
            } else {
                state = ElevatorState.MOVING;
            }
        }
    }

    public boolean isIdle() { return direction == Direction.IDLE; }
    public int getId() { return id; }
    public int getCurrentFloor() { return currentFloor; }
    public Direction getDirection() { return direction; }
}
```

---

## 3. Scheduling Strategy

```java
public interface SchedulingStrategy {
    Elevator selectElevator(List<Elevator> elevators, Request request);
}

public class LookScheduling implements SchedulingStrategy {
    // LOOK algorithm (elevator scan) — most common real-world strategy

    @Override
    public Elevator selectElevator(List<Elevator> elevators, Request request) {
        Elevator best = null;
        int bestScore = Integer.MAX_VALUE;
        for (Elevator e : elevators) {
            int score = calculateScore(e, request);
            if (score < bestScore) { bestScore = score; best = e; }
        }
        return best;
    }

    private int calculateScore(Elevator elevator, Request request) {
        int distance = Math.abs(elevator.getCurrentFloor() - request.getFloor());

        if (elevator.isIdle()) return distance;

        if (elevator.getDirection() == Direction.UP &&
            elevator.getCurrentFloor() <= request.getFloor() &&
            request.getDirection() == Direction.UP) return distance;

        if (elevator.getDirection() == Direction.DOWN &&
            elevator.getCurrentFloor() >= request.getFloor() &&
            request.getDirection() == Direction.DOWN) return distance;

        return distance + 1000; // moving away: penalize
    }
}

public class NearestElevator implements SchedulingStrategy {
    // Simple: pick the closest idle or same-direction elevator

    @Override
    public Elevator selectElevator(List<Elevator> elevators, Request request) {
        List<Elevator> idle = elevators.stream()
            .filter(Elevator::isIdle).collect(Collectors.toList());
        List<Elevator> pool = idle.isEmpty() ? elevators : idle;
        return pool.stream()
            .min(Comparator.comparingInt(e -> Math.abs(e.getCurrentFloor() - request.getFloor())))
            .orElse(null);
    }
}
```

---

## 4. Elevator Controller

```java
public class ElevatorController {
    private final List<Elevator> elevators;
    private final SchedulingStrategy strategy;

    public ElevatorController(List<Elevator> elevators, SchedulingStrategy strategy) {
        this.elevators = elevators;
        this.strategy = strategy;
    }

    public int requestElevator(int floor, Direction direction) {
        Request request = new Request(floor, direction);
        Elevator elevator = strategy.selectElevator(elevators, request);
        elevator.addDestination(floor);
        return elevator.getId();
    }

    public void selectFloor(int elevatorId, int floor) {
        Elevator elevator = getElevator(elevatorId);
        elevator.addDestination(floor);
    }

    public void step() {
        for (Elevator elevator : elevators) elevator.move();
    }

    private Elevator getElevator(int elevatorId) {
        return elevators.stream()
            .filter(e -> e.getId() == elevatorId).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Elevator " + elevatorId + " not found"));
    }
}
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
