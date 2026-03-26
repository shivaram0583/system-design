# LLD 08: Chess Game

> **Difficulty**: Medium
> **Key Concepts**: OOP, polymorphism, move validation, game state

---

## 1. Requirements

- Standard 8×8 chess board with all pieces
- Two-player turn-based game
- Validate legal moves per piece type
- Detect check, checkmate, stalemate
- Support castling, en passant, pawn promotion
- Move history and undo

---

## 2. Core Classes

```python
from enum import Enum
from abc import ABC, abstractmethod
from copy import deepcopy

class Color(Enum):
    WHITE = 1
    BLACK = 2

class Position:
    def __init__(self, row: int, col: int):
        self.row = row  # 0-7
        self.col = col  # 0-7

    def is_valid(self) -> bool:
        return 0 <= self.row < 8 and 0 <= self.col < 8

    def __eq__(self, other):
        return self.row == other.row and self.col == other.col

    def __hash__(self):
        return hash((self.row, self.col))

    def __repr__(self):
        col_letter = chr(ord('a') + self.col)
        return f"{col_letter}{self.row + 1}"
```

---

## 3. Pieces (Polymorphism)

```python
class Piece(ABC):
    def __init__(self, color: Color, position: Position):
        self.color = color
        self.position = position
        self.has_moved = False

    @abstractmethod
    def get_possible_moves(self, board: "Board") -> list[Position]:
        pass

    def move_to(self, position: Position):
        self.position = position
        self.has_moved = True


class Pawn(Piece):
    def get_possible_moves(self, board: "Board") -> list[Position]:
        moves = []
        direction = 1 if self.color == Color.WHITE else -1
        r, c = self.position.row, self.position.col

        # Forward one
        fwd = Position(r + direction, c)
        if fwd.is_valid() and board.get_piece(fwd) is None:
            moves.append(fwd)
            # Forward two (first move)
            fwd2 = Position(r + 2 * direction, c)
            if not self.has_moved and fwd2.is_valid() and board.get_piece(fwd2) is None:
                moves.append(fwd2)

        # Diagonal captures
        for dc in [-1, 1]:
            diag = Position(r + direction, c + dc)
            if diag.is_valid():
                target = board.get_piece(diag)
                if target and target.color != self.color:
                    moves.append(diag)

        return moves


class Rook(Piece):
    def get_possible_moves(self, board: "Board") -> list[Position]:
        return board.get_line_moves(self, [(0, 1), (0, -1), (1, 0), (-1, 0)])


class Bishop(Piece):
    def get_possible_moves(self, board: "Board") -> list[Position]:
        return board.get_line_moves(self, [(1, 1), (1, -1), (-1, 1), (-1, -1)])


class Queen(Piece):
    def get_possible_moves(self, board: "Board") -> list[Position]:
        return board.get_line_moves(self, [
            (0, 1), (0, -1), (1, 0), (-1, 0),
            (1, 1), (1, -1), (-1, 1), (-1, -1)
        ])


class Knight(Piece):
    def get_possible_moves(self, board: "Board") -> list[Position]:
        moves = []
        offsets = [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
                   (1, -2), (1, 2), (2, -1), (2, 1)]
        for dr, dc in offsets:
            pos = Position(self.position.row + dr, self.position.col + dc)
            if pos.is_valid():
                target = board.get_piece(pos)
                if target is None or target.color != self.color:
                    moves.append(pos)
        return moves


class King(Piece):
    def get_possible_moves(self, board: "Board") -> list[Position]:
        moves = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                pos = Position(self.position.row + dr, self.position.col + dc)
                if pos.is_valid():
                    target = board.get_piece(pos)
                    if target is None or target.color != self.color:
                        moves.append(pos)
        return moves
```

---

## 4. Board

```python
class Board:
    def __init__(self):
        self.grid: list[list[Piece | None]] = [[None] * 8 for _ in range(8)]
        self._setup_pieces()

    def _setup_pieces(self):
        # Pawns
        for c in range(8):
            self.place(Pawn(Color.WHITE, Position(1, c)), Position(1, c))
            self.place(Pawn(Color.BLACK, Position(6, c)), Position(6, c))

        # Rooks, Knights, Bishops, Queen, King
        back_rank = [Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook]
        for c, piece_cls in enumerate(back_rank):
            self.place(piece_cls(Color.WHITE, Position(0, c)), Position(0, c))
            self.place(piece_cls(Color.BLACK, Position(7, c)), Position(7, c))

    def get_piece(self, pos: Position) -> Piece | None:
        if pos.is_valid():
            return self.grid[pos.row][pos.col]
        return None

    def place(self, piece: Piece, pos: Position):
        self.grid[pos.row][pos.col] = piece

    def remove(self, pos: Position) -> Piece | None:
        piece = self.grid[pos.row][pos.col]
        self.grid[pos.row][pos.col] = None
        return piece

    def move_piece(self, from_pos: Position, to_pos: Position) -> Piece | None:
        piece = self.remove(from_pos)
        captured = self.remove(to_pos)
        piece.move_to(to_pos)
        self.place(piece, to_pos)
        return captured

    def get_line_moves(self, piece: Piece, directions: list[tuple]) -> list[Position]:
        """Sliding moves for Rook, Bishop, Queen."""
        moves = []
        for dr, dc in directions:
            r, c = piece.position.row + dr, piece.position.col + dc
            while 0 <= r < 8 and 0 <= c < 8:
                pos = Position(r, c)
                target = self.get_piece(pos)
                if target is None:
                    moves.append(pos)
                elif target.color != piece.color:
                    moves.append(pos)
                    break
                else:
                    break
                r += dr
                c += dc
        return moves

    def find_king(self, color: Color) -> Position:
        for r in range(8):
            for c in range(8):
                piece = self.grid[r][c]
                if isinstance(piece, King) and piece.color == color:
                    return piece.position
        raise Exception("King not found")

    def is_in_check(self, color: Color) -> bool:
        king_pos = self.find_king(color)
        opponent = Color.BLACK if color == Color.WHITE else Color.WHITE
        for r in range(8):
            for c in range(8):
                piece = self.grid[r][c]
                if piece and piece.color == opponent:
                    if king_pos in piece.get_possible_moves(self):
                        return True
        return False
```

---

## 5. Game Controller

```python
class GameStatus(Enum):
    ACTIVE = 1
    CHECK = 2
    CHECKMATE = 3
    STALEMATE = 4
    RESIGNED = 5

class Move:
    def __init__(self, piece: Piece, from_pos: Position, to_pos: Position,
                 captured: Piece = None):
        self.piece = piece
        self.from_pos = from_pos
        self.to_pos = to_pos
        self.captured = captured

class Game:
    def __init__(self, white_player: str, black_player: str):
        self.board = Board()
        self.current_turn = Color.WHITE
        self.status = GameStatus.ACTIVE
        self.move_history: list[Move] = []
        self.players = {Color.WHITE: white_player, Color.BLACK: black_player}

    def make_move(self, from_pos: Position, to_pos: Position) -> Move:
        if self.status in (GameStatus.CHECKMATE, GameStatus.STALEMATE, GameStatus.RESIGNED):
            raise Exception("Game is over")

        piece = self.board.get_piece(from_pos)
        if not piece or piece.color != self.current_turn:
            raise Exception("Invalid piece selection")

        legal_moves = self._get_legal_moves(piece)
        if to_pos not in legal_moves:
            raise Exception("Illegal move")

        captured = self.board.move_piece(from_pos, to_pos)
        move = Move(piece, from_pos, to_pos, captured)
        self.move_history.append(move)

        # Switch turn
        self.current_turn = Color.BLACK if self.current_turn == Color.WHITE else Color.WHITE

        # Update game status
        self._update_status()
        return move

    def _get_legal_moves(self, piece: Piece) -> list[Position]:
        """Filter moves that would leave own king in check."""
        possible = piece.get_possible_moves(self.board)
        legal = []
        for move_pos in possible:
            # Save state before simulation
            original_pos = Position(piece.position.row, piece.position.col)
            original_has_moved = piece.has_moved
            captured = self.board.move_piece(piece.position, move_pos)
            if not self.board.is_in_check(piece.color):
                legal.append(move_pos)
            # Undo move
            self.board.move_piece(move_pos, original_pos)
            piece.has_moved = original_has_moved  # restore original state
            if captured:
                captured.position = move_pos
                self.board.place(captured, move_pos)
        return legal

    def _update_status(self):
        if self.board.is_in_check(self.current_turn):
            if self._has_no_legal_moves():
                self.status = GameStatus.CHECKMATE
            else:
                self.status = GameStatus.CHECK
        elif self._has_no_legal_moves():
            self.status = GameStatus.STALEMATE
        else:
            self.status = GameStatus.ACTIVE

    def _has_no_legal_moves(self) -> bool:
        for r in range(8):
            for c in range(8):
                piece = self.board.grid[r][c]
                if piece and piece.color == self.current_turn:
                    if self._get_legal_moves(piece):
                        return False
        return True

    def resign(self):
        self.status = GameStatus.RESIGNED
```

---

## 6. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Polymorphism** | Piece subclasses | Each piece type defines its own move logic |
| **Template Method** | get_line_moves() | Shared sliding logic for Rook/Bishop/Queen |
| **Command** | Move objects | Undo support via move history |
| **State** | GameStatus | Track game lifecycle |

---

## 7. Edge Cases

- **Castling**: King + Rook haven't moved, no pieces between, not through check
- **En passant**: Capture pawn that just double-moved
- **Pawn promotion**: Pawn reaches 8th rank → promote to Queen/Rook/Bishop/Knight
- **Stalemate**: No legal moves but not in check → draw
- **Threefold repetition**: Same position 3 times → draw (track position hashes)

> **Next**: [09 — Snake and Ladder](09-snake-and-ladder.md)
