import Piece from './piece'
import SquareSet from '../square_set'
import { Point } from '@mrlhumphreys/jboardgame'
import { exists } from '../utils'

const MOVEMENT_VECTORS = [
  new Point(0, -1), 
  new Point(1, 0), 
  new Point(0, 1), 
  new Point(-1, 0) 
];

/** A piece that moves any number of squares orthogonally and captures by jumping over */
class Pao extends Piece {
  /**
   * The destinations that a pao can move from a square on a board.
   * @param {Square} square - The origin square.
   * @param {GameState} gameState - the game state being played on.
   * @return {SquareSet}
   */
  destinations(square, gameState) {
    return this._moveSquares(square, gameState).concat(this._captureSquares(square, gameState));
  }

  _moveSquares(square, gameState) {
    return gameState.squares.orthogonal(square).unoccupied().unblocked(square, gameState.squares);
  }

  _captureSquares(square, gameState) {
    let _squares = [];
    MOVEMENT_VECTORS.forEach((vector) => {
      let currentPoint = square.point().add(vector);
      let currentSquare = gameState.squares.findByCoordinate(currentPoint.x, currentPoint.y);

      // Step 1: move until the first occupied square (the screen / pao-jia).
      while (exists(currentSquare) && currentSquare.unoccupied()) {
        currentPoint = currentSquare.point().add(vector);
        currentSquare = gameState.squares.findByCoordinate(currentPoint.x, currentPoint.y);
      }

      // No screen in this direction => no capture.
      if (!exists(currentSquare) || currentSquare.unoccupied()) {
        return;
      }

      // Step 2: from the square after screen, find the first occupied square.
      let nextPoint = currentSquare.point().add(vector);
      let nextSquare = gameState.squares.findByCoordinate(nextPoint.x, nextPoint.y);
      while (exists(nextSquare) && nextSquare.unoccupied()) {
        nextPoint = nextSquare.point().add(vector);
        nextSquare = gameState.squares.findByCoordinate(nextPoint.x, nextPoint.y);
      }

      // Step 3: capture is valid only if that first occupied square is opponent.
      if (exists(nextSquare) && nextSquare.occupiedByOpponentOf(this.playerNumber)) {
        _squares.push(nextSquare);
      }
    });
    return new SquareSet({squares: _squares});
  }
}

export default Pao 
