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

    public makeMove(from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') {
        try {
            return this.game.move({ from, to, promotion });
        } catch (e) {
            return null;
        }
    }

    public undoMove() {
        return this.game.undo();
    }

    public resetGame() {
        this.game.reset();
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

    public getHistory() {
        return this.game.history({ verbose: true });
    }
}
