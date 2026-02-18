import Piece from './piece'
import SquareSet from '../square_set'
import { exists, compact, flat } from '../utils';

const MOVEMENT_MAP = [ 
  [[0,-1], [[-1,-2], [1,-2]]], 
  [[1,0], [[2,-1], [2,1]]], 
  [[0,1], [[-1,2], [1,2]]], 
  [[-1,0], [[-2,-1], [-2,1]]] 
];

/** A piece that moves in an l shape, but can be blocked by adjacent pieces */
class Ma extends Piece {
  /**
   * The destinations that a keima can move from a square on a board
   * @param {Square} square - THe origin square.
   * @param {GameState} gameState - the game state being played on.
   * @return {SquareSet}
   */
  destinations(square, gameState) {
    let _squares = compact(flat(MOVEMENT_MAP.map((row) => {
      let adjacentMap = row[0];
      let destinationsMap = row[1];

      let adjacent = this._findSquareByDisplacement(square, gameState, adjacentMap); 

      if (!exists(adjacent) || adjacent.occupied()) {
        return null;
      } else {
        return this._findValidDestinations(square, gameState, destinationsMap);
      }
    })));

    return new SquareSet({squares: _squares});
  }

  _findValidDestinations(square, gameState, destinationsMaps) {
    return destinationsMaps.map((destinationMap) => {
      return this._findValidDestination(square, gameState, destinationMap)
    });
  }

  _findValidDestination(square, gameState, destinationMap) {
    let destination = this._findSquareByDisplacement(square, gameState, destinationMap);
    if (exists(destination) && (destination.unoccupied() || destination.occupiedByOpponentOf(this.playerNumber))) {
      return destination;
    } else {
      return null;
    }
  }

  _findSquareByDisplacement(square, gameState, displacement) {
    let x = square.x + displacement[0];
    let y = square.y + displacement[1];
    return gameState.squares.findByCoordinate(x, y);
  }
}

export default Ma 
