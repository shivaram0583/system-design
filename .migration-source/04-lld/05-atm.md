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

```java
public enum TransactionType { BALANCE_INQUIRY, WITHDRAWAL, DEPOSIT, TRANSFER }

public enum ATMState { IDLE, CARD_INSERTED, AUTHENTICATED, TRANSACTION_IN_PROGRESS, OUT_OF_SERVICE }

public class Card {
    private final String cardNumber;
    private final String bankCode;

    public Card(String cardNumber, String bankCode) {
        this.cardNumber = cardNumber; this.bankCode = bankCode;
    }
    public String getCardNumber() { return cardNumber; }
}

public class Account {
    private final String accountId;
    private double balance;
    private final double dailyLimit;
    private double dailyWithdrawn = 0.0;

    public Account(String accountId, double balance, double dailyLimit) {
        this.accountId = accountId; this.balance = balance; this.dailyLimit = dailyLimit;
    }
    public Account(String accountId, double balance) { this(accountId, balance, 1000); }

    public boolean canWithdraw(double amount) {
        return balance >= amount && dailyWithdrawn + amount <= dailyLimit;
    }

    public void withdraw(double amount) {
        if (!canWithdraw(amount)) throw new RuntimeException("Insufficient funds or daily limit exceeded");
        balance -= amount;
        dailyWithdrawn += amount;
    }

    public void deposit(double amount) { balance += amount; }
    public double getBalance() { return balance; }
    public double getDailyWithdrawn() { return dailyWithdrawn; }
    public void setDailyWithdrawn(double val) { dailyWithdrawn = val; }
}

public class Transaction {
    private final String txnId;
    private final TransactionType txnType;
    private final Account account;
    private final double amount;
    private final LocalDateTime timestamp;
    private boolean success = false;

    public Transaction(TransactionType txnType, Account account, double amount) {
        this.txnId = UUID.randomUUID().toString();
        this.txnType = txnType; this.account = account;
        this.amount = amount; this.timestamp = LocalDateTime.now();
    }
    public void setSuccess(boolean success) { this.success = success; }
}
```

---

## 3. Cash Dispenser (Chain of Responsibility)

```java
public class CashDispenser {
    private final TreeMap<Integer, Integer> denominations = new TreeMap<>(Comparator.reverseOrder());

    public CashDispenser() {
        denominations.put(100, 500);
        denominations.put(50, 500);
        denominations.put(20, 1000);
        denominations.put(10, 1000);
    }

    public boolean canDispense(double amount) {
        return amount <= totalCash() && amount % 10 == 0;
    }

    public double totalCash() {
        return denominations.entrySet().stream()
            .mapToDouble(e -> (double) e.getKey() * e.getValue()).sum();
    }

    public Map<Integer, Integer> dispense(double amount) {
        if (!canDispense(amount)) throw new RuntimeException("Cannot dispense this amount");
        int remaining = (int) amount;
        Map<Integer, Integer> dispensed = new LinkedHashMap<>();

        for (Map.Entry<Integer, Integer> entry : denominations.entrySet()) {
            if (remaining <= 0) break;
            int denom = entry.getKey();
            int count = Math.min(remaining / denom, entry.getValue());
            if (count > 0) {
                dispensed.put(denom, count);
                entry.setValue(entry.getValue() - count);
                remaining -= denom * count;
            }
        }

        if (remaining > 0) {
            dispensed.forEach((d, c) -> denominations.merge(d, c, Integer::sum));
            throw new RuntimeException("Cannot make exact amount with available denominations");
        }
        return dispensed;
    }
}
```

---

## 4. ATM Controller (State Machine)

```java
public class ATM {
    private final String atmId;
    private ATMState state = ATMState.IDLE;
    private final CashDispenser dispenser;
    private Card currentCard;
    private Account currentAccount;
    private final List<Transaction> transactions = new ArrayList<>();

    public ATM(String atmId, CashDispenser dispenser) {
        this.atmId = atmId; this.dispenser = dispenser;
    }

    public void insertCard(Card card) {
        if (state != ATMState.IDLE) throw new RuntimeException("ATM is busy");
        currentCard = card;
        state = ATMState.CARD_INSERTED;
    }

    public boolean authenticate(String pin, BankService bankService) {
        if (state != ATMState.CARD_INSERTED) throw new RuntimeException("Insert card first");
        Account account = bankService.validatePin(currentCard, pin);
        if (account != null) {
            currentAccount = account;
            state = ATMState.AUTHENTICATED;
            return true;
        }
        return false;
    }

    public double checkBalance() {
        requireAuthenticated();
        Transaction txn = new Transaction(TransactionType.BALANCE_INQUIRY, currentAccount, 0);
        txn.setSuccess(true);
        transactions.add(txn);
        return currentAccount.getBalance();
    }

    public Map<Integer, Integer> withdraw(double amount) {
        requireAuthenticated();
        state = ATMState.TRANSACTION_IN_PROGRESS;

        if (!currentAccount.canWithdraw(amount)) {
            state = ATMState.AUTHENTICATED;
            throw new RuntimeException("Insufficient funds or daily limit exceeded");
        }
        if (!dispenser.canDispense(amount)) {
            state = ATMState.AUTHENTICATED;
            throw new RuntimeException("ATM cannot dispense this amount");
        }

        currentAccount.withdraw(amount);
        Map<Integer, Integer> notes;
        try {
            notes = dispenser.dispense(amount);
        } catch (Exception e) {
            currentAccount.deposit(amount);
            currentAccount.setDailyWithdrawn(currentAccount.getDailyWithdrawn() - amount);
            state = ATMState.AUTHENTICATED;
            throw e;
        }

        Transaction txn = new Transaction(TransactionType.WITHDRAWAL, currentAccount, amount);
        txn.setSuccess(true);
        transactions.add(txn);
        state = ATMState.AUTHENTICATED;
        return notes;
    }

    public void deposit(double amount) {
        requireAuthenticated();
        state = ATMState.TRANSACTION_IN_PROGRESS;
        currentAccount.deposit(amount);
        Transaction txn = new Transaction(TransactionType.DEPOSIT, currentAccount, amount);
        txn.setSuccess(true);
        transactions.add(txn);
        state = ATMState.AUTHENTICATED;
    }

    public void ejectCard() {
        currentCard = null; currentAccount = null;
        state = ATMState.IDLE;
    }

    private void requireAuthenticated() {
        if (state != ATMState.AUTHENTICATED) throw new RuntimeException("Not authenticated");
    }
}

public class BankService {
    private final Map<String, Account> accounts = new HashMap<>();
    private final Map<String, String> pins = new HashMap<>(); // cardNumber -> pin

    public Account validatePin(Card card, String pin) {
        if (pin.equals(pins.get(card.getCardNumber())))
            return accounts.get(card.getCardNumber());
        return null;
    }

    public void addAccount(String cardNumber, Account account, String pin) {
        accounts.put(cardNumber, account);
        pins.put(cardNumber, pin);
    }
}
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
