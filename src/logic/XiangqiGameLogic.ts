import JXiangqi from '../vendor/jxiangqi/index';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as const;

type XiangqiPieceType = 'jiang' | 'ju' | 'ma' | 'pao' | 'shi' | 'xiang' | 'zu';

type XiangqiSquare = {
  id: string;
  x: number;
  y: number;
  piece: {
    id: number;
    player_number: number;
    type: XiangqiPieceType;
  } | null;
};

type XiangqiMatchLike = {
  gameState: {
    currentPlayerNumber: number;
    findSquare: (id: string) => any;
  };
  winner: number | null;
  touchSquare: (squareId: string, playerNumber: number) => boolean;
};

export type XiangqiMove = {
  from: string;
  to: string;
  piece: XiangqiPieceType;
  color: 'w' | 'b';
  captured?: XiangqiPieceType;
};

export type XiangqiPiece = {
  type: XiangqiPieceType;
  color: 'w' | 'b';
};

const getMatchCtor = () => {
  const maybeDefault = (JXiangqi as unknown as { Match?: new (args: any) => XiangqiMatchLike }).Match;
  if (maybeDefault) return maybeDefault;

  const nested = (JXiangqi as unknown as { default?: { Match?: new (args: any) => XiangqiMatchLike } }).default?.Match;
  if (nested) return nested;

  throw new Error('Unable to resolve Match constructor from @mrlhumphreys/jxiangqi');
};

const buildInitialSquares = (): XiangqiSquare[] => {
  const squares: XiangqiSquare[] = [];

  const pieces = new Map<string, { player_number: number; type: XiangqiPieceType }>();

  const setBackRank = (rank: number, playerNumber: number) => {
    const back: XiangqiPieceType[] = ['ju', 'ma', 'xiang', 'shi', 'jiang', 'shi', 'xiang', 'ma', 'ju'];
    back.forEach((type, fileIndex) => {
      const id = `${FILES[fileIndex]}${rank}`;
      pieces.set(id, { player_number: playerNumber, type });
    });
  };

  setBackRank(10, 2);
  setBackRank(1, 1);

  ['b8', 'h8'].forEach((id) => pieces.set(id, { player_number: 2, type: 'pao' }));
  ['b3', 'h3'].forEach((id) => pieces.set(id, { player_number: 1, type: 'pao' }));
  ['a7', 'c7', 'e7', 'g7', 'i7'].forEach((id) => pieces.set(id, { player_number: 2, type: 'zu' }));
  ['a4', 'c4', 'e4', 'g4', 'i4'].forEach((id) => pieces.set(id, { player_number: 1, type: 'zu' }));

  let pieceId = 1;
  for (let y = 0; y < 10; y += 1) {
    const rank = 10 - y;
    for (let x = 0; x < 9; x += 1) {
      const id = `${FILES[x]}${rank}`;
      const piece = pieces.get(id);
      squares.push({
        id,
        x,
        y,
        piece: piece
          ? {
              id: pieceId++,
              player_number: piece.player_number,
              type: piece.type
            }
          : null
      });
    }
  }

  return squares;
};

export class XiangqiGameLogic {
  private match: XiangqiMatchLike;

  constructor() {
    this.match = this.createMatch();
  }

  private createMatch() {
    const MatchCtor = getMatchCtor();
    return new MatchCtor({
      id: 1,
      game_state: {
        current_player_number: 1,
        squares: buildInitialSquares()
      },
      players: [
        { player_number: 1, name: 'Red' },
        { player_number: 2, name: 'Black' }
      ],
      winner: null
    });
  }

  public resetGame() {
    this.match = this.createMatch();
  }

  public getTurn(): 'w' | 'b' {
    return this.match.gameState.currentPlayerNumber === 1 ? 'w' : 'b';
  }

  public getWinner(): 'w' | 'b' | null {
    if (this.match.winner === 1) return 'w';
    if (this.match.winner === 2) return 'b';
    return null;
  }

  public getPieceAt(squareId: string): XiangqiPiece | null {
    const square = this.match.gameState.findSquare(squareId);
    if (!square?.piece) return null;
    return {
      type: square.piece.type,
      color: square.piece.playerNumber === 1 ? 'w' : 'b'
    };
  }

  public getLegalMoves(squareId: string): string[] {
    const square = this.match.gameState.findSquare(squareId);
    if (!square?.piece) return [];

    const destinations = square.piece.destinations(square, this.match.gameState);
    if (!destinations?.squares) return [];

    return destinations.squares.map((s: any) => s.id);
  }

  public makeMove(from: string, to: string): XiangqiMove | null {
    const mover = this.getPieceAt(from);
    if (!mover) return null;

    const currentPlayer = this.match.gameState.currentPlayerNumber;
    const expectedColor = currentPlayer === 1 ? 'w' : 'b';
    if (mover.color !== expectedColor) return null;

    const captured = this.getPieceAt(to);

    const selected = this.match.touchSquare(from, currentPlayer);
    if (!selected) return null;

    const moved = this.match.touchSquare(to, currentPlayer);
    if (!moved) return null;

    return {
      from,
      to,
      piece: mover.type,
      color: mover.color,
      captured: captured?.type
    };
  }

  public getBoard() {
    const rows: Array<Array<XiangqiPiece | null>> = [];

    for (let rank = 10; rank >= 1; rank -= 1) {
      const row: Array<XiangqiPiece | null> = [];
      for (let fileIndex = 0; fileIndex < 9; fileIndex += 1) {
        const squareId = `${FILES[fileIndex]}${rank}`;
        row.push(this.getPieceAt(squareId));
      }
      rows.push(row);
    }

    return rows;
  }
}
