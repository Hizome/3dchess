export type GoColor = 'b' | 'w';

export type GoMove = {
  pointId: string;
  color: GoColor;
  captured: string[];
};

type GoStateSnapshot = {
  stones: Map<string, GoColor>;
  turn: GoColor;
  blackCaptures: number;
  whiteCaptures: number;
};

const MIN_BOARD_SIZE = 5;
const MAX_BOARD_SIZE = 25;

export class GoGameLogic {
  private readonly boardSize: number;
  private stones: Map<string, GoColor>;
  private turn: GoColor;
  private blackCaptures: number;
  private whiteCaptures: number;
  private history: GoStateSnapshot[];

  constructor(boardSize = 19) {
    const safeSize = Number.isInteger(boardSize) ? boardSize : 19;
    this.boardSize = Math.max(MIN_BOARD_SIZE, Math.min(MAX_BOARD_SIZE, safeSize));
    this.stones = new Map();
    this.turn = 'b';
    this.blackCaptures = 0;
    this.whiteCaptures = 0;
    this.history = [];
  }

  public resetGame() {
    this.stones.clear();
    this.turn = 'b';
    this.blackCaptures = 0;
    this.whiteCaptures = 0;
    this.history = [];
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

  public getCaptureCounts() {
    return { b: this.blackCaptures, w: this.whiteCaptures };
  }

  public canUndo() {
    return this.history.length > 0;
  }

  public undoMove() {
    const snapshot = this.history.pop();
    if (!snapshot) return null;
    this.stones = new Map(snapshot.stones);
    this.turn = snapshot.turn;
    this.blackCaptures = snapshot.blackCaptures;
    this.whiteCaptures = snapshot.whiteCaptures;
    return true;
  }

  public getAreaCounts() {
    const territory = this.getTerritoryCounts();
    let blackStones = 0;
    let whiteStones = 0;
    this.stones.forEach((color) => {
      if (color === 'b') blackStones += 1;
      else whiteStones += 1;
    });

    // Chinese-style area count: stones on board + surrounded empty intersections.
    return {
      b: blackStones + territory.b,
      w: whiteStones + territory.w
    };
  }

  public makeMove(pointId: string): GoMove | null {
    if (!this.isValidPointId(pointId)) return null;
    if (this.stones.has(pointId)) return null;

    const snapshot: GoStateSnapshot = {
      stones: new Map(this.stones),
      turn: this.turn,
      blackCaptures: this.blackCaptures,
      whiteCaptures: this.whiteCaptures
    };

    const color = this.turn;
    const opponentColor: GoColor = color === 'b' ? 'w' : 'b';
    const nextStones = new Map(this.stones);
    nextStones.set(pointId, color);

    const captured: string[] = [];

    // Capture opponent groups with no liberties after this move.
    this.getNeighbors(pointId).forEach((neighborId) => {
      if (nextStones.get(neighborId) !== opponentColor) return;
      const group = this.collectGroup(nextStones, neighborId, opponentColor);
      if (this.groupHasLiberty(nextStones, group)) return;
      group.forEach((id) => {
        nextStones.delete(id);
        captured.push(id);
      });
    });

    // Prevent suicide: if own new group has no liberty and captured nothing, revert.
    const ownGroup = this.collectGroup(nextStones, pointId, color);
    if (!this.groupHasLiberty(nextStones, ownGroup) && captured.length === 0) {
      return null;
    }

    this.history.push(snapshot);
    this.stones = nextStones;
    if (color === 'b') this.blackCaptures += captured.length;
    else this.whiteCaptures += captured.length;
    this.turn = this.turn === 'b' ? 'w' : 'b';

    return { pointId, color, captured };
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

  private getNeighbors(pointId: string) {
    const [xRaw, yRaw] = pointId.split(',');
    const x = Number(xRaw);
    const y = Number(yRaw);
    const candidates: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ];
    return candidates
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < this.boardSize && ny < this.boardSize)
      .map(([nx, ny]) => `${nx},${ny}`);
  }

  private collectGroup(stoneMap: Map<string, GoColor>, startId: string, color: GoColor) {
    const group = new Set<string>();
    const stack = [startId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (group.has(current)) continue;
      if (stoneMap.get(current) !== color) continue;

      group.add(current);
      this.getNeighbors(current).forEach((neighborId) => {
        if (!group.has(neighborId) && stoneMap.get(neighborId) === color) {
          stack.push(neighborId);
        }
      });
    }

    return group;
  }

  private groupHasLiberty(stoneMap: Map<string, GoColor>, group: Set<string>) {
    for (const pointId of group) {
      const hasLiberty = this.getNeighbors(pointId).some((neighborId) => !stoneMap.has(neighborId));
      if (hasLiberty) return true;
    }
    return false;
  }

  private getTerritoryCounts() {
    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;

    for (let y = 0; y < this.boardSize; y += 1) {
      for (let x = 0; x < this.boardSize; x += 1) {
        const startId = `${x},${y}`;
        if (visited.has(startId)) continue;
        if (this.stones.has(startId)) continue;

        const region: string[] = [];
        const boundaryColors = new Set<GoColor>();
        const stack = [startId];
        visited.add(startId);

        while (stack.length > 0) {
          const current = stack.pop();
          if (!current) continue;
          region.push(current);

          this.getNeighbors(current).forEach((neighborId) => {
            const neighborStone = this.stones.get(neighborId);
            if (neighborStone) {
              boundaryColors.add(neighborStone);
              return;
            }
            if (visited.has(neighborId)) return;
            visited.add(neighborId);
            stack.push(neighborId);
          });
        }

        if (boundaryColors.size === 1) {
          const owner = boundaryColors.values().next().value as GoColor | undefined;
          if (owner === 'b') blackTerritory += region.length;
          else if (owner === 'w') whiteTerritory += region.length;
        }
      }
    }

    return { b: blackTerritory, w: whiteTerritory };
  }
}
