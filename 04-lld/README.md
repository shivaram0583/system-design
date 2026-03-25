# Low-Level Design (LLD) Problems

> Each LLD covers: Classes/Modules, Responsibilities, Interfaces, Data Models, Sequence Flow, Pseudocode, Edge Cases, and Error Handling.

## Problems

| # | System | Difficulty | Key Concepts Tested |
|---|--------|-----------|-------------------|
| 01 | [Parking Lot](01-parking-lot.md) | Easy | OOP, Strategy pattern, enums |
| 02 | [Elevator System](02-elevator-system.md) | Medium | State machine, scheduling, concurrency |
| 03 | [Library Management](03-library-management.md) | Easy | CRUD, relationships, search |
| 04 | [BookMyShow Booking](04-bookmyshow-booking.md) | Medium | Concurrency, locking, seat selection |
| 05 | [ATM](05-atm.md) | Easy | State pattern, transactions, chain of responsibility |
| 06 | [Vending Machine](06-vending-machine.md) | Easy | State pattern, inventory, payment |
| 07 | [Splitwise](07-splitwise.md) | Medium | Graph simplification, debt optimization |
| 08 | [Chess](08-chess.md) | Medium | Polymorphism, move validation, game state |
| 09 | [Snake and Ladder](09-snake-and-ladder.md) | Easy | Board representation, turn management |
| 10 | [Tic-Tac-Toe](10-tic-tac-toe.md) | Easy | Win detection, board state, extensibility |
| 11 | [Pub-Sub System](11-pub-sub-system.md) | Medium | Observer pattern, threading, topic management |
| 12 | [Cache (LRU/LFU)](12-cache-lru-lfu.md) | Medium | Doubly linked list + hashmap, eviction policies |
| 13 | [Rate Limiter](13-rate-limiter.md) | Medium | Token bucket, sliding window, Strategy pattern |
| 14 | [Logger Framework](14-logger-framework.md) | Easy-Med | Singleton, Chain of Responsibility, formatting |
| 15 | [Notification Service](15-notification-service.md) | Medium | Strategy pattern, templates, channels |
| 16 | [Payment Processing](16-payment-processing.md) | Medium | State machine, idempotency, error handling |

## LLD Approach Framework

For every LLD problem, follow this structure:

1. **Clarify Requirements** — What entities exist? What operations are needed?
2. **Identify Core Objects** — Nouns become classes, verbs become methods
3. **Define Relationships** — Has-a, Is-a, Uses-a
4. **Design Interfaces** — What contracts do components expose?
5. **Write Data Models** — Fields, types, constraints
6. **Draw Sequence Diagrams** — Step-by-step flow for key operations
7. **Handle Edge Cases** — Concurrent access, invalid input, boundary conditions
8. **Apply Design Patterns** — Strategy, Observer, State, Factory, Singleton where appropriate
