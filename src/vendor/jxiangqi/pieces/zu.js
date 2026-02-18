import Piece from './piece'

/** A Zu piece. Moves forward one square and can also move one space horizontally when on the opposite side of the river. */
class Zu extends Piece {
  /**
   * The destinations that a Zu can move to from a square on a board.
   * @param {Square} square - The origin square.
   * @param {GameState} gameState - the game state being played on.
   * @return {SquareSet}
   */
  destinations(square, gameState) {
    return this._sameFileForwardsAndOrSameRank(square, gameState).inRange(square, 1).unoccupiedOrOccupiedByOpponent(this.playerNumber);
  }

  _sameFileForwardsAndOrSameRank(square, gameState) {
    if (this._onPlayersSide(square)) {
      return this._sameFileForwards(square, gameState);
    } else {
      return this._sameFileForwards(square, gameState).concat(this._sameRank(square, gameState));
    }
  }

  _sameFileForwards(square, gameState) {
    return gameState.squares.inDirection(square, this.playerNumber).sameFile(square);
  }

  _sameRank(square, gameState) {
    return gameState.squares.sameRank(square);
  }

  _onPlayersSide(square) {
    return ((this.playerNumber === 2 && square.y <= 4) || (this.playerNumber === 1 && square.y >= 5));
  }
}

export default Zu 

