import { Chess } from 'chess.js';

export class GameLogic {
    private game: Chess;

    constructor() {
        this.game = new Chess();
    }

    public getBoard() {
        return this.game.board();
    }

    public getTurn() {
        return this.game.turn();
    }

    public makeMove(from: string, to: string) {
        try {
            return this.game.move({ from, to });
        } catch (e) {
            return null;
        }
    }

    public isGameOver() {
        return this.game.isGameOver();
    }

    public getLegalMoves(square?: string) {
        if (square) {
            const moves = this.game.moves({ square: square as any, verbose: true });
            return moves.map(m => m.to);
        }
        return this.game.moves();
    }
}
