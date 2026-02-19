export type GoColor = 'b' | 'w';

export type GoMove = {
  pointId: string;
  color: GoColor;
};

const MIN_BOARD_SIZE = 5;
const MAX_BOARD_SIZE = 25;

export class GoGameLogic {
  private readonly boardSize: number;
  private readonly stones: Map<string, GoColor>;
  private turn: GoColor;

  constructor(boardSize = 19) {
    const safeSize = Number.isInteger(boardSize) ? boardSize : 19;
    this.boardSize = Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_SIZE, safeSize));
    this.stones = new Map();
    this.turn = 'b';
  }

  public resetGame() {
    this.stones.clear();
    this.turn = 'b';
  }

  public getBoardSize() {
    return this.boardSize;
  }

  public getTurn(): GoColor {
    return this.turn;
  }

  public getStoneAt(pointId: string): GoColor | null {
    return this.stones.get(pointId) ?? null;
  }

  public getAllStones() {
    return new Map(this.stones);
  }

  public makeMove(pointId: string): GoMove | null {
    if (!this.isValidPointId(pointId)) return null;
    if (this.stones.has(pointId)) return null;

    const color = this.turn;
    this.stones.set(pointId, color);
    this.turn = this.turn === 'b' ? 'w' : 'b';

    return { pointId, color };
  }

  private isValidPointId(pointId: string) {
    const [xRaw, yRaw] = pointId.split(',');
    const x = Number(xRaw);
    const y = Number(yRaw);
    if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
    if (x < 0 || y < 0) return false;
    if (x >= this.boardSize || y >= this.boardSize) return false;
    return true;
  }
}
