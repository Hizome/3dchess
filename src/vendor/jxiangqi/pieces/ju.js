import Piece from './piece'

/** A piece that moves any number of squares orthogonally */
class Ju extends Piece {
  /**
   * The destinations that a ju can move from a square on a board.
   * @param {Square} square - The origin square.
   * @param {GameState} gameState - the game state being played on.
   * @return {SquareSet}
   */
  destinations(square, gameState) {
    return gameState.squares.orthogonal(square).unoccupiedOrOccupiedByOpponent(this.playerNumber).unblocked(square, gameState.squares);
  }
}

export default Ju 

