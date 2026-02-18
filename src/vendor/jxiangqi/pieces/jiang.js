import Piece from './piece'

const PALACE_X_COORDINATES = [3, 4, 5];
const PALACE_Y_COORDINATES = [0, 1, 2, 7, 8, 9];

/** A Jiang piece. Moves 1 space orthogonally within the palace. */
class Jiang extends Piece {
  /**
   * The destinations that a Jiang can move to from a square on a board.
   * @param {Square} square - The origin square.
   * @param {GameState} gameState - the game state being played on.
   * @return {SquareSet}
   */
  destinations(square, gameState) {
    return this._palaceSquares(gameState).orthogonal(square).atRange(square, 1).unoccupiedOrOccupiedByOpponent(this.playerNumber);
  }

  _palaceSquares(gameState) {
    return gameState.squares.where({x: PALACE_X_COORDINATES, y: PALACE_Y_COORDINATES});
  }
}

export default Jiang 

