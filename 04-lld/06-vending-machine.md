# LLD 06: Vending Machine

> **Difficulty**: Easy
> **Key Concepts**: State machine, inventory, coin handling

---

## 1. Requirements

- Display available products with prices
- Accept coins/notes, track inserted amount
- Select product, dispense if enough money inserted
- Return change using optimal denomination
- Refund all inserted money on cancel
- Track inventory, show "sold out" when empty

---

## 2. Core Classes

```python
from enum import Enum
from abc import ABC, abstractmethod

class MachineState(Enum):
    IDLE = 1
    HAS_MONEY = 2
    DISPENSING = 3
    OUT_OF_SERVICE = 4

class Coin(Enum):
    PENNY = 0.01
    NICKEL = 0.05
    DIME = 0.10
    QUARTER = 0.25
    DOLLAR = 1.00

class Product:
    def __init__(self, name: str, price: float, quantity: int):
        self.name = name
        self.price = price
        self.quantity = quantity

    def is_available(self) -> bool:
        return self.quantity > 0

    def dispense(self):
        if not self.is_available():
            raise Exception(f"{self.name} is sold out")
        self.quantity -= 1


class Inventory:
    def __init__(self):
        self.products: dict[str, Product] = {}  # slot_code -> Product

    def add_product(self, slot: str, product: Product):
        self.products[slot] = product

    def get_product(self, slot: str) -> Product | None:
        return self.products.get(slot)

    def restock(self, slot: str, quantity: int):
        product = self.products.get(slot)
        if product:
            product.quantity += quantity
```

---

## 3. Vending Machine (State Machine)

```python
class VendingMachine:
    def __init__(self):
        self.inventory = Inventory()
        self.state = MachineState.IDLE
        self.current_amount = 0.0
        self.coin_storage: dict[Coin, int] = {c: 100 for c in Coin}  # change reservoir

    def insert_coin(self, coin: Coin):
        if self.state == MachineState.OUT_OF_SERVICE:
            raise Exception("Machine is out of service")
        self.current_amount += coin.value
        self.coin_storage[coin] = self.coin_storage.get(coin, 0) + 1
        self.state = MachineState.HAS_MONEY

    def insert_money(self, amount: float):
        """For bill acceptor."""
        if self.state == MachineState.OUT_OF_SERVICE:
            raise Exception("Machine is out of service")
        self.current_amount += amount
        self.state = MachineState.HAS_MONEY

    def select_product(self, slot: str) -> dict:
        if self.state not in (MachineState.HAS_MONEY, MachineState.IDLE):
            raise Exception("Cannot select product now")

        product = self.inventory.get_product(slot)
        if not product:
            raise Exception("Invalid slot")
        if not product.is_available():
            raise Exception(f"{product.name} is sold out")
        if self.current_amount < product.price:
            raise Exception(
                f"Insert ${product.price - self.current_amount:.2f} more"
            )

        # Dispense
        self.state = MachineState.DISPENSING
        product.dispense()
        change = self.current_amount - product.price
        change_coins = self._make_change(change) if change > 0 else {}

        self.current_amount = 0
        self.state = MachineState.IDLE

        return {
            "product": product.name,
            "change": change,
            "change_breakdown": change_coins,
        }

    def cancel(self) -> float:
        """Refund all inserted money."""
        refund = self.current_amount
        self.current_amount = 0
        self.state = MachineState.IDLE
        return refund

    def _make_change(self, amount: float) -> dict[str, int]:
        remaining = round(amount * 100)  # work in cents to avoid float issues
        change = {}
        for coin in sorted(Coin, key=lambda c: c.value, reverse=True):
            coin_cents = int(coin.value * 100)
            count = min(remaining // coin_cents, self.coin_storage.get(coin, 0))
            if count > 0:
                change[coin.name] = count
                self.coin_storage[coin] -= count
                remaining -= coin_cents * count
        if remaining > 0:
            raise Exception("Cannot make exact change")
        return change

    def display(self) -> list[dict]:
        items = []
        for slot, product in self.inventory.products.items():
            items.append({
                "slot": slot,
                "name": product.name,
                "price": product.price,
                "available": product.is_available(),
            })
        return items
```

---

## 4. Sequence Flow

```
1. Machine is IDLE, display shows products
2. User inserts $1.50 (quarters) → state: HAS_MONEY, current_amount: 1.50
3. User selects slot "A1" (Coke, $1.25)
   a. Check: product available? Yes
   b. Check: current_amount >= price? $1.50 >= $1.25 → Yes
   c. Dispense Coke, decrement quantity
   d. Calculate change: $0.25
   e. _make_change(0.25) → {QUARTER: 1}
   f. Return change, reset → state: IDLE
4. Alternative: User presses Cancel → refund $1.50 → state: IDLE
```

---

## 5. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **State Machine** | MachineState | Control valid operations per state |
| **Greedy Algorithm** | _make_change() | Optimal denomination for change |
| **Singleton** | VendingMachine (optional) | One machine instance |

---

## 6. Edge Cases

- **Exact change only**: If coin storage is low, display "exact change only"
- **Sold out**: Individual product sold out vs entire machine empty
- **Power failure**: Persist state to recover (current_amount, inventory)
- **Coin jam**: State → OUT_OF_SERVICE, alert maintenance
- **Float precision**: Use cents (integers) internally to avoid rounding errors

> **Next**: [07 — Splitwise](07-splitwise.md)
