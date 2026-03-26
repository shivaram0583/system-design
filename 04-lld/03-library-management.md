# LLD 03: Library Management System

> **Difficulty**: Easy
> **Key Concepts**: OOP, CRUD, search, state transitions

---

## 1. Requirements

- Add, remove, search books (by title, author, ISBN)
- Register members, track membership status
- Issue (checkout) and return books
- Reserve books that are currently checked out
- Fine calculation for overdue books
- Track book copies (multiple copies of same title)

---

## 2. Core Classes

```java
public enum BookStatus { AVAILABLE, CHECKED_OUT, RESERVED, LOST }

public enum MemberStatus { ACTIVE, SUSPENDED, CLOSED }

public class Book {
    private final String isbn;
    private final String title;
    private final String author;
    private final String category;

    public Book(String isbn, String title, String author, String category) {
        this.isbn = isbn; this.title = title;
        this.author = author; this.category = category;
    }
    public String getIsbn() { return isbn; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
}

public class BookCopy {
    private final String copyId;
    private final Book book;
    private BookStatus status = BookStatus.AVAILABLE;
    private LocalDateTime dueDate;
    private Member borrowedBy;
    private Member reservedBy;

    public BookCopy(String copyId, Book book) {
        this.copyId = copyId; this.book = book;
    }

    public void checkout(Member member, int loanDays) {
        if (status != BookStatus.AVAILABLE)
            throw new RuntimeException("Book copy " + copyId + " is not available");
        status = BookStatus.CHECKED_OUT;
        borrowedBy = member;
        dueDate = LocalDateTime.now().plusDays(loanDays);
    }
    public void checkout(Member member) { checkout(member, 14); }

    public double returnBook() {
        double fine = calculateFine();
        status = (reservedBy != null) ? BookStatus.RESERVED : BookStatus.AVAILABLE;
        borrowedBy = null;
        dueDate = null;
        return fine;
    }

    public void reserve(Member member) {
        if (status != BookStatus.CHECKED_OUT && status != BookStatus.AVAILABLE)
            throw new RuntimeException("Cannot reserve this book");
        reservedBy = member;
        if (status == BookStatus.AVAILABLE) status = BookStatus.RESERVED;
    }

    private double calculateFine() {
        if (dueDate != null && LocalDateTime.now().isAfter(dueDate)) {
            long overdueDays = java.time.Duration.between(dueDate, LocalDateTime.now()).toDays();
            return overdueDays * 0.50;
        }
        return 0.0;
    }

    public String getCopyId() { return copyId; }
    public Book getBook() { return book; }
    public BookStatus getStatus() { return status; }
}

public class Member {
    private static final int MAX_BOOKS = 5;
    private final String memberId;
    private final String name;
    private final String email;
    private MemberStatus status = MemberStatus.ACTIVE;
    private final List<BookCopy> checkedOutBooks = new ArrayList<>();
    private double totalFines = 0.0;

    public Member(String memberId, String name, String email) {
        this.memberId = memberId; this.name = name; this.email = email;
    }

    public boolean canCheckout() {
        return status == MemberStatus.ACTIVE
            && checkedOutBooks.size() < MAX_BOOKS
            && totalFines == 0;
    }

    public String getMemberId() { return memberId; }
    public List<BookCopy> getCheckedOutBooks() { return checkedOutBooks; }
    public double getTotalFines() { return totalFines; }
    public void addFine(double fine) { totalFines += fine; }
}
```

---

## 3. Library System

```java
public class Library {
    private final Map<String, Book> books = new HashMap<>();       // isbn -> Book
    private final Map<String, BookCopy> copies = new HashMap<>();  // copyId -> BookCopy
    private final Map<String, Member> members = new HashMap<>();   // memberId -> Member

    public void addBook(Book book, int numCopies) {
        books.put(book.getIsbn(), book);
        for (int i = 1; i <= numCopies; i++) {
            String copyId = book.getIsbn() + "-" + i;
            copies.put(copyId, new BookCopy(copyId, book));
        }
    }

    public void registerMember(Member member) { members.put(member.getMemberId(), member); }

    public List<Book> searchByTitle(String title) {
        return books.values().stream()
            .filter(b -> b.getTitle().toLowerCase().contains(title.toLowerCase()))
            .collect(Collectors.toList());
    }

    public List<Book> searchByAuthor(String author) {
        return books.values().stream()
            .filter(b -> b.getAuthor().toLowerCase().contains(author.toLowerCase()))
            .collect(Collectors.toList());
    }

    public Book searchByIsbn(String isbn) { return books.get(isbn); }

    public BookCopy checkoutBook(String memberId, String isbn) {
        Member member = members.get(memberId);
        if (!member.canCheckout())
            throw new RuntimeException("Member cannot checkout (limit reached or fines owed)");
        BookCopy copy = findAvailableCopy(isbn);
        if (copy == null) throw new RuntimeException("No available copies");
        copy.checkout(member);
        member.getCheckedOutBooks().add(copy);
        return copy;
    }

    public double returnBook(String memberId, String copyId) {
        Member member = members.get(memberId);
        BookCopy copy = copies.get(copyId);
        double fine = copy.returnBook();
        member.getCheckedOutBooks().remove(copy);
        member.addFine(fine);
        return fine;
    }

    public void reserveBook(String memberId, String isbn) {
        Member member = members.get(memberId);
        for (BookCopy copy : copies.values()) {
            if (copy.getBook().getIsbn().equals(isbn)
                    && copy.getStatus() == BookStatus.CHECKED_OUT) {
                copy.reserve(member);
                return;
            }
        }
        throw new RuntimeException("No checked-out copies to reserve");
    }

    private BookCopy findAvailableCopy(String isbn) {
        return copies.values().stream()
            .filter(c -> c.getBook().getIsbn().equals(isbn)
                      && c.getStatus() == BookStatus.AVAILABLE)
            .findFirst().orElse(null);
    }
}
```

---

## 4. Sequence Flow

```
Checkout:
  1. Member requests book by ISBN
  2. Library.checkout_book(member_id, isbn)
  3. Check: member.can_checkout() → active, under limit, no fines
  4. Find available BookCopy for ISBN
  5. copy.checkout(member) → status = CHECKED_OUT, set due_date
  6. Add to member.checked_out_books

Return:
  1. Member returns book copy
  2. Library.return_book(member_id, copy_id)
  3. copy.return_book() → calculate fine, reset status
  4. If reserved_by exists → status = RESERVED, notify reserved member
  5. Remove from member.checked_out_books
  6. Add fine to member.total_fines
```

---

## 5. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Repository** | Library (books, members dicts) | Centralized data access |
| **State** | BookStatus transitions | Model book lifecycle |
| **Observer** | Reservation notification | Notify when reserved book returned |

---

## 6. Edge Cases

- **No copies available**: Offer reservation
- **Member at limit**: Reject checkout, show current books
- **Overdue fines**: Block checkout until fines paid
- **Lost book**: Mark as LOST, charge replacement fee
- **Duplicate reservation**: Only one reservation per copy

> **Next**: [04 — BookMyShow](04-bookmyshow.md)
