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

```python
from enum import Enum
from datetime import datetime, timedelta

class BookStatus(Enum):
    AVAILABLE = 1
    CHECKED_OUT = 2
    RESERVED = 3
    LOST = 4

class MemberStatus(Enum):
    ACTIVE = 1
    SUSPENDED = 2
    CLOSED = 3

class Book:
    def __init__(self, isbn: str, title: str, author: str, category: str):
        self.isbn = isbn
        self.title = title
        self.author = author
        self.category = category

class BookCopy:
    def __init__(self, copy_id: str, book: Book):
        self.copy_id = copy_id
        self.book = book
        self.status = BookStatus.AVAILABLE
        self.due_date = None
        self.borrowed_by = None
        self.reserved_by = None

    def checkout(self, member: "Member", loan_days: int = 14):
        if self.status != BookStatus.AVAILABLE:
            raise Exception(f"Book copy {self.copy_id} is not available")
        self.status = BookStatus.CHECKED_OUT
        self.borrowed_by = member
        self.due_date = datetime.now() + timedelta(days=loan_days)

    def return_book(self) -> float:
        fine = self._calculate_fine()
        if self.reserved_by:
            self.status = BookStatus.RESERVED
        else:
            self.status = BookStatus.AVAILABLE
        self.borrowed_by = None
        self.due_date = None
        return fine

    def reserve(self, member: "Member"):
        if self.status not in (BookStatus.CHECKED_OUT, BookStatus.AVAILABLE):
            raise Exception("Cannot reserve this book")
        self.reserved_by = member
        if self.status == BookStatus.AVAILABLE:
            self.status = BookStatus.RESERVED

    def _calculate_fine(self) -> float:
        if self.due_date and datetime.now() > self.due_date:
            overdue_days = (datetime.now() - self.due_date).days
            return overdue_days * 0.50  # $0.50 per day
        return 0.0


class Member:
    MAX_BOOKS = 5

    def __init__(self, member_id: str, name: str, email: str):
        self.member_id = member_id
        self.name = name
        self.email = email
        self.status = MemberStatus.ACTIVE
        self.checked_out_books: list[BookCopy] = []
        self.total_fines = 0.0

    def can_checkout(self) -> bool:
        return (self.status == MemberStatus.ACTIVE and
                len(self.checked_out_books) < self.MAX_BOOKS and
                self.total_fines == 0)
```

---

## 3. Library System

```python
class Library:
    def __init__(self):
        self.books: dict[str, Book] = {}           # isbn -> Book
        self.copies: dict[str, BookCopy] = {}       # copy_id -> BookCopy
        self.members: dict[str, Member] = {}        # member_id -> Member

    def add_book(self, book: Book, num_copies: int = 1):
        self.books[book.isbn] = book
        for i in range(num_copies):
            copy_id = f"{book.isbn}-{i+1}"
            self.copies[copy_id] = BookCopy(copy_id, book)

    def register_member(self, member: Member):
        self.members[member.member_id] = member

    def search_by_title(self, title: str) -> list[Book]:
        return [b for b in self.books.values() if title.lower() in b.title.lower()]

    def search_by_author(self, author: str) -> list[Book]:
        return [b for b in self.books.values() if author.lower() in b.author.lower()]

    def search_by_isbn(self, isbn: str) -> Book | None:
        return self.books.get(isbn)

    def checkout_book(self, member_id: str, isbn: str) -> BookCopy:
        member = self.members[member_id]
        if not member.can_checkout():
            raise Exception("Member cannot checkout (limit reached or fines owed)")

        # Find available copy
        copy = self._find_available_copy(isbn)
        if not copy:
            raise Exception("No available copies")

        copy.checkout(member)
        member.checked_out_books.append(copy)
        return copy

    def return_book(self, member_id: str, copy_id: str) -> float:
        member = self.members[member_id]
        copy = self.copies[copy_id]
        fine = copy.return_book()
        member.checked_out_books.remove(copy)
        member.total_fines += fine
        return fine

    def reserve_book(self, member_id: str, isbn: str):
        member = self.members[member_id]
        copies = [c for c in self.copies.values() if c.book.isbn == isbn]
        if not copies:
            raise Exception("Book not found")
        # Reserve the first checked-out copy
        for copy in copies:
            if copy.status == BookStatus.CHECKED_OUT:
                copy.reserve(member)
                return
        raise Exception("All copies are available — just check one out")

    def _find_available_copy(self, isbn: str) -> BookCopy | None:
        for copy in self.copies.values():
            if copy.book.isbn == isbn and copy.status == BookStatus.AVAILABLE:
                return copy
        return None
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
