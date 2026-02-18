import Piece from './piece'

/** A piece that moves 2 spaces diagonally on its side of the river */
class Xiang extends Piece {
  /**
   * The destinations that a Xiang can move from a square on a board.
   * @param {Square} square - The origin square.
   * @param {GameState} gameState - the game state being played on.
   * @return {SquareSet}
   */
  destinations(square, gameState) {
    return this._playersSideSquares(gameState).diagonal(square).atRange(square, 2).unoccupiedOrOccupiedByOpponent(this.playerNumber).unblocked(square, gameState.squares);
  }

  _playersSideSquares(gameState) {
    let condition; 

    if (this.playerNumber == 2) {
      condition = (y) => { return y <= 4 };
    } else {
      condition = (y) => { return y >= 5 };
    }

    return gameState.squares.where({y: condition});
  }
}

export default Xiang 

