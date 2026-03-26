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

```java
public enum SplitType { EQUAL, EXACT, PERCENTAGE }

public class User {
    private final String userId;
    private final String name;
    private final String email;

    public User(String userId, String name, String email) {
        this.userId = userId; this.name = name; this.email = email;
    }
    public String getUserId() { return userId; }
    public String getName() { return name; }
}

public class Group {
    private final String groupId;
    private final String name;
    private final List<User> members = new ArrayList<>();
    private final List<Expense> expenses = new ArrayList<>();

    public Group(String name, User creator) {
        this.groupId = UUID.randomUUID().toString();
        this.name = name;
        members.add(creator);
    }

    public void addMember(User user) {
        if (!members.contains(user)) members.add(user);
    }

    public String getGroupId() { return groupId; }
    public List<User> getMembers() { return members; }
}

public class Split {
    private final User user;
    private final double amount; // what this user owes

    public Split(User user, double amount) { this.user = user; this.amount = amount; }
    public User getUser() { return user; }
    public double getAmount() { return amount; }
}

public class Expense {
    private final String expenseId;
    private final String description;
    private final double totalAmount;
    private final User paidBy;
    private final List<Split> splits;
    private final Group group;
    private final LocalDateTime createdAt;

    public Expense(String description, double totalAmount, User paidBy,
                   List<Split> splits, Group group) {
        this.expenseId = UUID.randomUUID().toString();
        this.description = description;
        this.totalAmount = totalAmount;
        this.paidBy = paidBy;
        this.splits = splits;
        this.group = group;
        this.createdAt = LocalDateTime.now();

        double splitTotal = splits.stream().mapToDouble(Split::getAmount).sum();
        if (Math.abs(splitTotal - totalAmount) > 0.01)
            throw new RuntimeException("Splits (" + splitTotal + ") don't add up to total (" + totalAmount + ")");
    }

    public User getPaidBy() { return paidBy; }
    public List<Split> getSplits() { return splits; }
    public Group getGroup() { return group; }
}
```

---

## 3. Split Strategies

```java
public interface SplitStrategy {
    List<Split> calculateSplits(double total, List<User> users, Map<String, Double> params);
}

public class EqualSplit implements SplitStrategy {
    @Override
    public List<Split> calculateSplits(double total, List<User> users, Map<String, Double> params) {
        double share = Math.round(total / users.size() * 100.0) / 100.0;
        List<Split> splits = new ArrayList<>();
        for (int i = 0; i < users.size() - 1; i++) splits.add(new Split(users.get(i), share));
        double remainder = Math.round((total - share * (users.size() - 1)) * 100.0) / 100.0;
        splits.add(new Split(users.get(users.size() - 1), remainder));
        return splits;
    }
}

public class ExactSplit implements SplitStrategy {
    @Override
    public List<Split> calculateSplits(double total, List<User> users, Map<String, Double> params) {
        // params: userId -> amount
        List<Split> splits = new ArrayList<>();
        for (User user : users)
            splits.add(new Split(user, params.getOrDefault(user.getUserId(), 0.0)));
        return splits;
    }
}

public class PercentageSplit implements SplitStrategy {
    @Override
    public List<Split> calculateSplits(double total, List<User> users, Map<String, Double> params) {
        // params: userId -> percentage
        double pctSum = params.values().stream().mapToDouble(Double::doubleValue).sum();
        if (Math.abs(pctSum - 100) > 0.01)
            throw new RuntimeException("Percentages must add up to 100");
        List<Split> splits = new ArrayList<>();
        for (User user : users) {
            double pct = params.getOrDefault(user.getUserId(), 0.0);
            splits.add(new Split(user, Math.round(total * pct / 100 * 100.0) / 100.0));
        }
        return splits;
    }
}
```

---

## 4. Balance & Debt Simplification

```java
public class BalanceService {
    // balances[groupId][(fromUser, toUser)] = amount owed
    private final Map<String, Map<String, Double>> balances = new HashMap<>();

    private String key(String from, String to) { return from + "->" + to; }

    private double getDebt(String groupId, String from, String to) {
        return balances.getOrDefault(groupId, Map.of()).getOrDefault(key(from, to), 0.0);
    }

    private void setDebt(String groupId, String from, String to, double amount) {
        balances.computeIfAbsent(groupId, k -> new HashMap<>()).put(key(from, to), amount);
    }

    public void addExpense(Expense expense) {
        String groupId = expense.getGroup().getGroupId();
        for (Split split : expense.getSplits()) {
            if (!split.getUser().getUserId().equals(expense.getPaidBy().getUserId())) {
                String from = split.getUser().getUserId();
                String to = expense.getPaidBy().getUserId();
                double current = getDebt(groupId, from, to) + split.getAmount();
                double reverse = getDebt(groupId, to, from);
                if (reverse > 0) {
                    double net = current - reverse;
                    if (net > 0) { setDebt(groupId, from, to, net); setDebt(groupId, to, from, 0); }
                    else { setDebt(groupId, to, from, -net); setDebt(groupId, from, to, 0); }
                } else {
                    setDebt(groupId, from, to, current);
                }
            }
        }
    }

    public Map<String, Double> getBalances(String groupId) {
        Map<String, Double> net = new HashMap<>();
        balances.getOrDefault(groupId, Map.of()).forEach((k, amount) -> {
            if (amount > 0) {
                String[] parts = k.split("->");
                net.merge(parts[0], -amount, Double::sum); // owes
                net.merge(parts[1], amount, Double::sum);  // is owed
            }
        });
        return net;
    }

    public List<String[]> simplifyDebts(String groupId) {
        Map<String, Double> net = getBalances(groupId);
        PriorityQueue<double[]> creditors = new PriorityQueue<>((a, b) -> Double.compare(b[0], a[0]));
        PriorityQueue<double[]> debtors = new PriorityQueue<>((a, b) -> Double.compare(b[0], a[0]));
        Map<Integer, String> idxToUser = new HashMap<>();
        int idx = 0;
        for (Map.Entry<String, Double> e : net.entrySet()) {
            idxToUser.put(idx, e.getKey());
            if (e.getValue() > 0.01) creditors.add(new double[]{e.getValue(), idx});
            else if (e.getValue() < -0.01) debtors.add(new double[]{-e.getValue(), idx});
            idx++;
        }

        List<String[]> transactions = new ArrayList<>();
        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            double[] cr = creditors.poll();
            double[] db = debtors.poll();
            double settle = Math.min(cr[0], db[0]);
            transactions.add(new String[]{idxToUser.get((int) db[1]),
                idxToUser.get((int) cr[1]), String.valueOf(Math.round(settle * 100.0) / 100.0)});
            if (cr[0] - settle > 0.01) creditors.add(new double[]{cr[0] - settle, cr[1]});
            if (db[0] - settle > 0.01) debtors.add(new double[]{db[0] - settle, db[1]});
        }
        return transactions;
    }

    public void settleUp(String groupId, String fromUser, String toUser, double amount) {
        double current = getDebt(groupId, fromUser, toUser);
        setDebt(groupId, fromUser, toUser, Math.max(0, current - amount));
    }
}
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
