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

```java
public enum Color { WHITE, BLACK }

public class Position {
    private final int row; // 0-7
    private final int col; // 0-7

    public Position(int row, int col) { this.row = row; this.col = col; }
    public int getRow() { return row; }
    public int getCol() { return col; }
    public boolean isValid() { return row >= 0 && row < 8 && col >= 0 && col < 8; }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof Position)) return false;
        Position p = (Position) o;
        return row == p.row && col == p.col;
    }

    @Override
    public int hashCode() { return Objects.hash(row, col); }

    @Override
    public String toString() { return "" + (char)('a' + col) + (row + 1); }
}
```

---

## 3. Pieces (Polymorphism)

```java
public abstract class Piece {
    protected Color color;
    protected Position position;
    protected boolean hasMoved = false;

    public Piece(Color color, Position position) {
        this.color = color; this.position = position;
    }

    public abstract List<Position> getPossibleMoves(Board board);

    public void moveTo(Position position) { this.position = position; hasMoved = true; }
    public Color getColor() { return color; }
    public Position getPosition() { return position; }
    public void setPosition(Position p) { this.position = p; }
    public boolean hasMoved() { return hasMoved; }
    public void setHasMoved(boolean v) { hasMoved = v; }
}

public class Pawn extends Piece {
    public Pawn(Color color, Position position) { super(color, position); }

    @Override
    public List<Position> getPossibleMoves(Board board) {
        List<Position> moves = new ArrayList<>();
        int dir = (color == Color.WHITE) ? 1 : -1;
        int r = position.getRow(), c = position.getCol();

        Position fwd = new Position(r + dir, c);
        if (fwd.isValid() && board.getPiece(fwd) == null) {
            moves.add(fwd);
            Position fwd2 = new Position(r + 2 * dir, c);
            if (!hasMoved && fwd2.isValid() && board.getPiece(fwd2) == null)
                moves.add(fwd2);
        }
        for (int dc : new int[]{-1, 1}) {
            Position diag = new Position(r + dir, c + dc);
            if (diag.isValid()) {
                Piece target = board.getPiece(diag);
                if (target != null && target.getColor() != color) moves.add(diag);
            }
        }
        return moves;
    }
}

public class Rook extends Piece {
    public Rook(Color color, Position position) { super(color, position); }
    @Override
    public List<Position> getPossibleMoves(Board board) {
        return board.getLineMoves(this, new int[][]{{0,1},{0,-1},{1,0},{-1,0}});
    }
}

public class Bishop extends Piece {
    public Bishop(Color color, Position position) { super(color, position); }
    @Override
    public List<Position> getPossibleMoves(Board board) {
        return board.getLineMoves(this, new int[][]{{1,1},{1,-1},{-1,1},{-1,-1}});
    }
}

public class Queen extends Piece {
    public Queen(Color color, Position position) { super(color, position); }
    @Override
    public List<Position> getPossibleMoves(Board board) {
        return board.getLineMoves(this, new int[][]{
            {0,1},{0,-1},{1,0},{-1,0},{1,1},{1,-1},{-1,1},{-1,-1}});
    }
}

public class Knight extends Piece {
    public Knight(Color color, Position position) { super(color, position); }
    @Override
    public List<Position> getPossibleMoves(Board board) {
        List<Position> moves = new ArrayList<>();
        int[][] offsets = {{-2,-1},{-2,1},{-1,-2},{-1,2},{1,-2},{1,2},{2,-1},{2,1}};
        for (int[] o : offsets) {
            Position pos = new Position(position.getRow() + o[0], position.getCol() + o[1]);
            if (pos.isValid()) {
                Piece target = board.getPiece(pos);
                if (target == null || target.getColor() != color) moves.add(pos);
            }
        }
        return moves;
    }
}

public class King extends Piece {
    public King(Color color, Position position) { super(color, position); }
    @Override
    public List<Position> getPossibleMoves(Board board) {
        List<Position> moves = new ArrayList<>();
        for (int dr = -1; dr <= 1; dr++) {
            for (int dc = -1; dc <= 1; dc++) {
                if (dr == 0 && dc == 0) continue;
                Position pos = new Position(position.getRow() + dr, position.getCol() + dc);
                if (pos.isValid()) {
                    Piece target = board.getPiece(pos);
                    if (target == null || target.getColor() != color) moves.add(pos);
                }
            }
        }
        return moves;
    }
}
```

---

## 4. Board

```java
public class Board {
    private final Piece[][] grid = new Piece[8][8];

    public Board() { setupPieces(); }

    private void setupPieces() {
        for (int c = 0; c < 8; c++) {
            place(new Pawn(Color.WHITE, new Position(1, c)), new Position(1, c));
            place(new Pawn(Color.BLACK, new Position(6, c)), new Position(6, c));
        }
        Piece[] whiteBack = {new Rook(Color.WHITE, new Position(0,0)),
            new Knight(Color.WHITE, new Position(0,1)), new Bishop(Color.WHITE, new Position(0,2)),
            new Queen(Color.WHITE, new Position(0,3)), new King(Color.WHITE, new Position(0,4)),
            new Bishop(Color.WHITE, new Position(0,5)), new Knight(Color.WHITE, new Position(0,6)),
            new Rook(Color.WHITE, new Position(0,7))};
        Piece[] blackBack = {new Rook(Color.BLACK, new Position(7,0)),
            new Knight(Color.BLACK, new Position(7,1)), new Bishop(Color.BLACK, new Position(7,2)),
            new Queen(Color.BLACK, new Position(7,3)), new King(Color.BLACK, new Position(7,4)),
            new Bishop(Color.BLACK, new Position(7,5)), new Knight(Color.BLACK, new Position(7,6)),
            new Rook(Color.BLACK, new Position(7,7))};
        for (int c = 0; c < 8; c++) {
            place(whiteBack[c], new Position(0, c));
            place(blackBack[c], new Position(7, c));
        }
    }

    public Piece getPiece(Position pos) {
        return pos.isValid() ? grid[pos.getRow()][pos.getCol()] : null;
    }

    public void place(Piece piece, Position pos) { grid[pos.getRow()][pos.getCol()] = piece; }

    public Piece remove(Position pos) {
        Piece p = grid[pos.getRow()][pos.getCol()];
        grid[pos.getRow()][pos.getCol()] = null;
        return p;
    }

    public Piece movePiece(Position from, Position to) {
        Piece piece = remove(from);
        Piece captured = remove(to);
        piece.moveTo(to);
        place(piece, to);
        return captured;
    }

    public List<Position> getLineMoves(Piece piece, int[][] directions) {
        List<Position> moves = new ArrayList<>();
        for (int[] d : directions) {
            int r = piece.getPosition().getRow() + d[0];
            int c = piece.getPosition().getCol() + d[1];
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                Position pos = new Position(r, c);
                Piece target = getPiece(pos);
                if (target == null) { moves.add(pos); }
                else if (target.getColor() != piece.getColor()) { moves.add(pos); break; }
                else break;
                r += d[0]; c += d[1];
            }
        }
        return moves;
    }

    public Position findKing(Color color) {
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
                if (grid[r][c] instanceof King && grid[r][c].getColor() == color)
                    return grid[r][c].getPosition();
        throw new RuntimeException("King not found");
    }

    public boolean isInCheck(Color color) {
        Position kingPos = findKing(color);
        Color opponent = (color == Color.WHITE) ? Color.BLACK : Color.WHITE;
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
                if (grid[r][c] != null && grid[r][c].getColor() == opponent)
                    if (grid[r][c].getPossibleMoves(this).contains(kingPos))
                        return true;
        return false;
    }

    public Piece[][] getGrid() { return grid; }
}
```

---

## 5. Game Controller

```java
public enum GameStatus { ACTIVE, CHECK, CHECKMATE, STALEMATE, RESIGNED }

public class Move {
    private final Piece piece;
    private final Position fromPos;
    private final Position toPos;
    private final Piece captured;

    public Move(Piece piece, Position fromPos, Position toPos, Piece captured) {
        this.piece = piece; this.fromPos = fromPos;
        this.toPos = toPos; this.captured = captured;
    }
    public Piece getCaptured() { return captured; }
}

public class Game {
    private final Board board = new Board();
    private Color currentTurn = Color.WHITE;
    private GameStatus status = GameStatus.ACTIVE;
    private final List<Move> moveHistory = new ArrayList<>();
    private final Map<Color, String> players;

    public Game(String whitePlayer, String blackPlayer) {
        players = Map.of(Color.WHITE, whitePlayer, Color.BLACK, blackPlayer);
    }

    public Move makeMove(Position from, Position to) {
        if (status == GameStatus.CHECKMATE || status == GameStatus.STALEMATE
                || status == GameStatus.RESIGNED)
            throw new RuntimeException("Game is over");

        Piece piece = board.getPiece(from);
        if (piece == null || piece.getColor() != currentTurn)
            throw new RuntimeException("Invalid piece selection");

        List<Position> legal = getLegalMoves(piece);
        if (!legal.contains(to)) throw new RuntimeException("Illegal move");

        Piece captured = board.movePiece(from, to);
        Move move = new Move(piece, from, to, captured);
        moveHistory.add(move);

        currentTurn = (currentTurn == Color.WHITE) ? Color.BLACK : Color.WHITE;
        updateStatus();
        return move;
    }

    private List<Position> getLegalMoves(Piece piece) {
        List<Position> legal = new ArrayList<>();
        for (Position movePos : piece.getPossibleMoves(board)) {
            Position origPos = new Position(piece.getPosition().getRow(), piece.getPosition().getCol());
            boolean origMoved = piece.hasMoved();
            Piece captured = board.movePiece(piece.getPosition(), movePos);
            if (!board.isInCheck(piece.getColor())) legal.add(movePos);
            board.movePiece(movePos, origPos);
            piece.setHasMoved(origMoved);
            if (captured != null) {
                captured.setPosition(movePos);
                board.place(captured, movePos);
            }
        }
        return legal;
    }

    private void updateStatus() {
        if (board.isInCheck(currentTurn)) {
            status = hasNoLegalMoves() ? GameStatus.CHECKMATE : GameStatus.CHECK;
        } else {
            status = hasNoLegalMoves() ? GameStatus.STALEMATE : GameStatus.ACTIVE;
        }
    }

    private boolean hasNoLegalMoves() {
        Piece[][] grid = board.getGrid();
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
                if (grid[r][c] != null && grid[r][c].getColor() == currentTurn)
                    if (!getLegalMoves(grid[r][c]).isEmpty()) return false;
        return true;
    }

    public void resign() { status = GameStatus.RESIGNED; }
    public GameStatus getStatus() { return status; }
}
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
