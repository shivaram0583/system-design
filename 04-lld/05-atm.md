# LLD 05: ATM Machine

> **Difficulty**: Easy
> **Key Concepts**: State machine, Chain of Responsibility, transaction handling

---

## 1. Requirements

- Authenticate user with card + PIN
- Check balance
- Withdraw cash (dispense optimal denomination mix)
- Deposit cash/checks
- Transfer between accounts
- Print receipt
- Handle insufficient funds, daily limits, machine out of cash

---

## 2. Core Classes

```python
from enum import Enum
from abc import ABC, abstractmethod
from datetime import datetime
import uuid

class TransactionType(Enum):
    BALANCE_INQUIRY = 1
    WITHDRAWAL = 2
    DEPOSIT = 3
    TRANSFER = 4

class ATMState(Enum):
    IDLE = 1
    CARD_INSERTED = 2
    AUTHENTICATED = 3
    TRANSACTION_IN_PROGRESS = 4
    OUT_OF_SERVICE = 5

class Card:
    def __init__(self, card_number: str, bank_code: str):
        self.card_number = card_number
        self.bank_code = bank_code

class Account:
    def __init__(self, account_id: str, balance: float, daily_limit: float = 1000):
        self.account_id = account_id
        self.balance = balance
        self.daily_limit = daily_limit
        self.daily_withdrawn = 0.0

    def can_withdraw(self, amount: float) -> bool:
        return (self.balance >= amount and
                self.daily_withdrawn + amount <= self.daily_limit)

    def withdraw(self, amount: float):
        if not self.can_withdraw(amount):
            raise Exception("Insufficient funds or daily limit exceeded")
        self.balance -= amount
        self.daily_withdrawn += amount

    def deposit(self, amount: float):
        self.balance += amount

class Transaction:
    def __init__(self, txn_type: TransactionType, account: Account, amount: float = 0):
        self.txn_id = str(uuid.uuid4())
        self.txn_type = txn_type
        self.account = account
        self.amount = amount
        self.timestamp = datetime.now()
        self.success = False
```

---

## 3. Cash Dispenser (Chain of Responsibility)

```python
class CashDispenser:
    """Dispenses cash using optimal denomination mix."""

    def __init__(self):
        self.denominations = {
            100: 500,  # 500 notes of $100
            50: 500,
            20: 1000,
            10: 1000,
        }

    def can_dispense(self, amount: float) -> bool:
        return amount <= self.total_cash() and amount % 10 == 0

    def total_cash(self) -> float:
        return sum(denom * count for denom, count in self.denominations.items())

    def dispense(self, amount: float) -> dict[int, int]:
        """Return denomination breakdown using greedy approach."""
        if not self.can_dispense(amount):
            raise Exception("Cannot dispense this amount")

        remaining = int(amount)
        dispensed = {}

        for denom in sorted(self.denominations.keys(), reverse=True):
            if remaining <= 0:
                break
            count = min(remaining // denom, self.denominations[denom])
            if count > 0:
                dispensed[denom] = count
                self.denominations[denom] -= count
                remaining -= denom * count

        if remaining > 0:
            # Rollback
            for d, c in dispensed.items():
                self.denominations[d] += c
            raise Exception("Cannot make exact amount with available denominations")

        return dispensed
```

---

## 4. ATM Controller (State Machine)

```python
class ATM:
    def __init__(self, atm_id: str, dispenser: CashDispenser):
        self.atm_id = atm_id
        self.state = ATMState.IDLE
        self.dispenser = dispenser
        self.current_card = None
        self.current_account = None
        self.transactions: list[Transaction] = []

    def insert_card(self, card: Card):
        if self.state != ATMState.IDLE:
            raise Exception("ATM is busy")
        self.current_card = card
        self.state = ATMState.CARD_INSERTED

    def authenticate(self, pin: str, bank_service: "BankService") -> bool:
        if self.state != ATMState.CARD_INSERTED:
            raise Exception("Insert card first")
        account = bank_service.validate_pin(self.current_card, pin)
        if account:
            self.current_account = account
            self.state = ATMState.AUTHENTICATED
            return True
        return False

    def check_balance(self) -> float:
        self._require_authenticated()
        txn = Transaction(TransactionType.BALANCE_INQUIRY, self.current_account)
        txn.success = True
        self.transactions.append(txn)
        return self.current_account.balance

    def withdraw(self, amount: float) -> dict[int, int]:
        self._require_authenticated()
        self.state = ATMState.TRANSACTION_IN_PROGRESS

        if not self.current_account.can_withdraw(amount):
            self.state = ATMState.AUTHENTICATED
            raise Exception("Insufficient funds or daily limit exceeded")

        if not self.dispenser.can_dispense(amount):
            self.state = ATMState.AUTHENTICATED
            raise Exception("ATM cannot dispense this amount")

        # Debit account first, then dispense
        self.current_account.withdraw(amount)
        try:
            notes = self.dispenser.dispense(amount)
        except Exception:
            # Rollback account debit
            self.current_account.deposit(amount)
            self.current_account.daily_withdrawn -= amount
            self.state = ATMState.AUTHENTICATED
            raise

        txn = Transaction(TransactionType.WITHDRAWAL, self.current_account, amount)
        txn.success = True
        self.transactions.append(txn)
        self.state = ATMState.AUTHENTICATED
        return notes

    def deposit(self, amount: float):
        self._require_authenticated()
        self.state = ATMState.TRANSACTION_IN_PROGRESS
        self.current_account.deposit(amount)
        txn = Transaction(TransactionType.DEPOSIT, self.current_account, amount)
        txn.success = True
        self.transactions.append(txn)
        self.state = ATMState.AUTHENTICATED

    def eject_card(self):
        self.current_card = None
        self.current_account = None
        self.state = ATMState.IDLE

    def _require_authenticated(self):
        if self.state != ATMState.AUTHENTICATED:
            raise Exception("Not authenticated")


class BankService:
    """Simulates bank backend for PIN validation."""
    def __init__(self):
        self.accounts: dict[str, Account] = {}
        self.pins: dict[str, str] = {}  # card_number -> pin

    def validate_pin(self, card: Card, pin: str) -> Account | None:
        if self.pins.get(card.card_number) == pin:
            return self.accounts.get(card.card_number)
        return None
```

---

## 5. Sequence Flow

```
1. User inserts card → ATM.insert_card() → state: CARD_INSERTED
2. User enters PIN → ATM.authenticate() → BankService validates
3. Success → state: AUTHENTICATED
4. User selects "Withdraw $200" → ATM.withdraw(200)
   a. Check: account.can_withdraw(200) → sufficient funds + daily limit
   b. Check: dispenser.can_dispense(200) → enough cash in ATM
   c. account.withdraw(200) → debit balance
   d. dispenser.dispense(200) → {100: 2} (two $100 bills)
   e. Record transaction → state: AUTHENTICATED
5. User ejects card → ATM.eject_card() → state: IDLE
```

---

## 6. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **State Machine** | ATMState | Control valid operations per state |
| **Chain of Responsibility** | Denomination selection | Greedy approach for optimal bill mix |
| **Transaction** | Withdraw with rollback | Atomicity — rollback account if dispense fails |

---

## 7. Edge Cases

- **Wrong PIN 3 times**: Lock card, retain it
- **ATM out of cash**: State → OUT_OF_SERVICE
- **Network failure**: Queue transaction, retry when online
- **Power outage mid-transaction**: WAL-style logging for recovery
- **Partial dispense**: Mechanical jam → rollback account debit

> **Next**: [06 — Vending Machine](06-vending-machine.md)
