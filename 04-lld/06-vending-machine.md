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

```java
public enum MachineState { IDLE, HAS_MONEY, DISPENSING, OUT_OF_SERVICE }

public enum Coin {
    PENNY(1), NICKEL(5), DIME(10), QUARTER(25), DOLLAR(100);
    private final int cents;
    Coin(int cents) { this.cents = cents; }
    public int getCents() { return cents; }
}

public class Product {
    private final String name;
    private final double price;
    private int quantity;

    public Product(String name, double price, int quantity) {
        this.name = name; this.price = price; this.quantity = quantity;
    }

    public boolean isAvailable() { return quantity > 0; }

    public void dispense() {
        if (!isAvailable()) throw new RuntimeException(name + " is sold out");
        quantity--;
    }

    public String getName() { return name; }
    public double getPrice() { return price; }
    public int getQuantity() { return quantity; }
    public void addQuantity(int qty) { quantity += qty; }
}

public class Inventory {
    private final Map<String, Product> products = new HashMap<>(); // slot -> Product

    public void addProduct(String slot, Product product) { products.put(slot, product); }
    public Product getProduct(String slot) { return products.get(slot); }
    public void restock(String slot, int quantity) {
        Product p = products.get(slot);
        if (p != null) p.addQuantity(quantity);
    }
    public Map<String, Product> getProducts() { return products; }
}
```

---

## 3. Vending Machine (State Machine)

```java
public class VendingMachine {
    private final Inventory inventory = new Inventory();
    private MachineState state = MachineState.IDLE;
    private double currentAmount = 0.0;
    private final Map<Coin, Integer> coinStorage = new EnumMap<>(Coin.class);

    public VendingMachine() {
        for (Coin c : Coin.values()) coinStorage.put(c, 100); // change reservoir
    }

    public void insertCoin(Coin coin) {
        if (state == MachineState.OUT_OF_SERVICE)
            throw new RuntimeException("Machine is out of service");
        currentAmount += coin.getCents() / 100.0;
        coinStorage.merge(coin, 1, Integer::sum);
        state = MachineState.HAS_MONEY;
    }

    public void insertMoney(double amount) {
        if (state == MachineState.OUT_OF_SERVICE)
            throw new RuntimeException("Machine is out of service");
        currentAmount += amount;
        state = MachineState.HAS_MONEY;
    }

    public Map<String, Object> selectProduct(String slot) {
        if (state != MachineState.HAS_MONEY && state != MachineState.IDLE)
            throw new RuntimeException("Cannot select product now");

        Product product = inventory.getProduct(slot);
        if (product == null) throw new RuntimeException("Invalid slot");
        if (!product.isAvailable()) throw new RuntimeException(product.getName() + " is sold out");
        if (currentAmount < product.getPrice())
            throw new RuntimeException(String.format("Insert $%.2f more",
                product.getPrice() - currentAmount));

        state = MachineState.DISPENSING;
        product.dispense();
        double change = currentAmount - product.getPrice();
        Map<String, Integer> changeCoins = (change > 0) ? makeChange(change) : Map.of();

        currentAmount = 0;
        state = MachineState.IDLE;

        return Map.of("product", product.getName(), "change", change,
                      "change_breakdown", changeCoins);
    }

    public double cancel() {
        double refund = currentAmount;
        currentAmount = 0;
        state = MachineState.IDLE;
        return refund;
    }

    private Map<String, Integer> makeChange(double amount) {
        int remaining = (int) Math.round(amount * 100);
        Map<String, Integer> change = new LinkedHashMap<>();
        Coin[] sorted = Coin.values();
        Arrays.sort(sorted, Comparator.comparingInt(Coin::getCents).reversed());
        for (Coin coin : sorted) {
            int count = Math.min(remaining / coin.getCents(), coinStorage.getOrDefault(coin, 0));
            if (count > 0) {
                change.put(coin.name(), count);
                coinStorage.merge(coin, -count, Integer::sum);
                remaining -= coin.getCents() * count;
            }
        }
        if (remaining > 0) throw new RuntimeException("Cannot make exact change");
        return change;
    }
}
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
