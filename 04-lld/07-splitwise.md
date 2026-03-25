# LLD 07: Splitwise (Expense Sharing)

> **Difficulty**: Medium
> **Key Concepts**: Graph simplification, debt minimization, split strategies

---

## 1. Requirements

- Create groups (trips, roommates, etc.)
- Add expenses with various split types (equal, exact, percentage)
- Track who owes whom within a group
- Simplify debts (minimize number of transactions)
- Settle up (record payments)
- Activity feed / expense history

---

## 2. Core Classes

```python
from enum import Enum
from datetime import datetime
import uuid

class SplitType(Enum):
    EQUAL = 1
    EXACT = 2
    PERCENTAGE = 3

class User:
    def __init__(self, user_id: str, name: str, email: str):
        self.user_id = user_id
        self.name = name
        self.email = email

class Group:
    def __init__(self, name: str, creator: User):
        self.group_id = str(uuid.uuid4())
        self.name = name
        self.members: list[User] = [creator]
        self.expenses: list["Expense"] = []

    def add_member(self, user: User):
        if user not in self.members:
            self.members.append(user)

class Split:
    """Represents one user's share of an expense."""
    def __init__(self, user: User, amount: float):
        self.user = user
        self.amount = amount  # what this user owes

class Expense:
    def __init__(self, description: str, total_amount: float,
                 paid_by: User, splits: list[Split], group: Group):
        self.expense_id = str(uuid.uuid4())
        self.description = description
        self.total_amount = total_amount
        self.paid_by = paid_by
        self.splits = splits
        self.group = group
        self.created_at = datetime.now()

        # Validate
        split_total = sum(s.amount for s in splits)
        if abs(split_total - total_amount) > 0.01:
            raise Exception(f"Splits ({split_total}) don't add up to total ({total_amount})")
```

---

## 3. Split Strategies

```python
from abc import ABC, abstractmethod

class SplitStrategy(ABC):
    @abstractmethod
    def calculate_splits(self, total: float, users: list[User],
                         params: dict = None) -> list[Split]:
        pass

class EqualSplit(SplitStrategy):
    def calculate_splits(self, total: float, users: list[User],
                         params: dict = None) -> list[Split]:
        share = round(total / len(users), 2)
        # Handle rounding: last person gets remainder
        splits = [Split(u, share) for u in users[:-1]]
        remainder = round(total - share * (len(users) - 1), 2)
        splits.append(Split(users[-1], remainder))
        return splits

class ExactSplit(SplitStrategy):
    def calculate_splits(self, total: float, users: list[User],
                         params: dict = None) -> list[Split]:
        # params: {user_id: amount}
        amounts = params or {}
        splits = []
        for user in users:
            amount = amounts.get(user.user_id, 0)
            splits.append(Split(user, amount))
        return splits

class PercentageSplit(SplitStrategy):
    def calculate_splits(self, total: float, users: list[User],
                         params: dict = None) -> list[Split]:
        # params: {user_id: percentage}
        percentages = params or {}
        if abs(sum(percentages.values()) - 100) > 0.01:
            raise Exception("Percentages must add up to 100")
        splits = []
        for user in users:
            pct = percentages.get(user.user_id, 0)
            splits.append(Split(user, round(total * pct / 100, 2)))
        return splits
```

---

## 4. Balance & Debt Simplification

```python
from collections import defaultdict
import heapq

class BalanceService:
    def __init__(self):
        # balances[group_id][(from_user, to_user)] = amount owed
        self.balances: dict[str, dict[tuple, float]] = defaultdict(lambda: defaultdict(float))

    def add_expense(self, expense: Expense):
        group_id = expense.group.group_id
        for split in expense.splits:
            if split.user.user_id != expense.paid_by.user_id:
                # split.user owes expense.paid_by
                key = (split.user.user_id, expense.paid_by.user_id)
                reverse_key = (expense.paid_by.user_id, split.user.user_id)
                self.balances[group_id][key] += split.amount
                # Net out reverse debts
                if self.balances[group_id][reverse_key] > 0:
                    net = self.balances[group_id][key] - self.balances[group_id][reverse_key]
                    if net > 0:
                        self.balances[group_id][key] = net
                        self.balances[group_id][reverse_key] = 0
                    else:
                        self.balances[group_id][reverse_key] = -net
                        self.balances[group_id][key] = 0

    def get_balances(self, group_id: str) -> dict[str, float]:
        """Net balance per user: positive = owed money, negative = owes money."""
        net = defaultdict(float)
        for (from_u, to_u), amount in self.balances[group_id].items():
            if amount > 0:
                net[from_u] -= amount  # owes
                net[to_u] += amount    # is owed
        return dict(net)

    def simplify_debts(self, group_id: str) -> list[tuple[str, str, float]]:
        """Minimize number of transactions using greedy algorithm."""
        net = self.get_balances(group_id)

        # Separate creditors (positive) and debtors (negative)
        creditors = []  # max-heap (amount, user_id)
        debtors = []    # max-heap (amount, user_id)

        for user_id, balance in net.items():
            if balance > 0.01:
                heapq.heappush(creditors, (-balance, user_id))
            elif balance < -0.01:
                heapq.heappush(debtors, (balance, user_id))  # negative = most debt first

        transactions = []
        while creditors and debtors:
            credit_amt, creditor = heapq.heappop(creditors)
            debt_amt, debtor = heapq.heappop(debtors)
            credit_amt = -credit_amt  # convert back to positive
            debt_amt = -debt_amt

            settle = min(credit_amt, debt_amt)
            transactions.append((debtor, creditor, round(settle, 2)))

            remaining_credit = credit_amt - settle
            remaining_debt = debt_amt - settle

            if remaining_credit > 0.01:
                heapq.heappush(creditors, (-remaining_credit, creditor))
            if remaining_debt > 0.01:
                heapq.heappush(debtors, (-remaining_debt, debtor))

        return transactions

    def settle_up(self, group_id: str, from_user: str, to_user: str, amount: float):
        key = (from_user, to_user)
        self.balances[group_id][key] = max(0, self.balances[group_id][key] - amount)
```

---

## 5. Sequence Flow

```
Add Expense:
  1. User A pays $120 for dinner, split equally among A, B, C
  2. EqualSplit → [A: $40, B: $40, C: $40]
  3. BalanceService.add_expense():
     B owes A $40, C owes A $40

Simplify Debts:
  After multiple expenses:
    A owes B $50, B owes C $30, C owes A $20
  Net balances: A = -30, B = +20, C = +10
  Simplified: A pays B $20, A pays C $10 (2 transactions instead of 3)

Settle Up:
  B pays A $40 → BalanceService.settle_up() → debt cleared
```

---

## 6. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Strategy** | SplitStrategy | Equal/Exact/Percentage split logic |
| **Observer** | Notifications | Notify users when expense added or settled |
| **Greedy Algorithm** | simplify_debts() | Minimize number of settlement transactions |

---

## 7. Edge Cases

- **Rounding**: $100 split 3 ways → $33.33, $33.33, $33.34 (last gets remainder)
- **Self-owe**: Payer's own split is excluded from debts
- **Empty group**: No expenses → all balances zero
- **Negative settle**: Can't settle more than owed
- **Multi-currency**: Store in base currency, convert at expense time

> **Next**: [08 — Chess Game](08-chess-game.md)
