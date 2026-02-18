import { exists } from './utils'
import SquareSet from './square_set'

/** A Xiangqi Game State */
class GameState {
  /**
   * Create a game state.
   * @param {Object} args - The properties of the game state.
   * @param {number} args.current_player_number - The number of the current player.
   * @param {Object[]} args.squares - An array of square properties
   */
  constructor(args) {
    /** @member {number} */
    this.currentPlayerNumber = args.current_player_number;

    /** @member {SquareSet} */
    this.squares = new SquareSet({squares: args.squares});
  }

  /**
   * The game state serialized as simple objects.
   * @return {Object}
   */
  get asJson() {
    return {
      current_player_number: this.currentPlayerNumber,
      squares: this.squares.asJson().squares,
    };
  }

  /**
   * The square that's selected.
   * @return {(Square|null)}
   */
  get selectedSquare() {
    return this.squares.selected();
  }

  /**
   * Find square with id.
   * @param {number} id - The id of the square.
   * @return {(Square|null)}
   */
  findSquare(id) {
    return this.squares.findById(id);
  }

  /**
   * Is it the player's turn?
   * @param {number} playerNumber - The number of the player.
   * @return {boolean}
   */
  playersTurn(playerNumber) {
    return this.currentPlayerNumber === playerNumber;
  }

  /**
   * Get the captured square.
   * It's the to square if occupied.
   * @param {Square} from - The origin square.
   * @param {Square} to - The destination square.
   * @return {(Square|null)}
   */
  capturedSquare(from, to) {
    if (to.occupied()) {
      return to;
    } else {
      return null;
    }
  }

  /**
   * If a piece is being captured, get the id of the square it's on.
   * @param {Square} from - The origin square.
   * @param {Square} to - The destination square.
   * @return {(Square|null)}
   */
  capturedSquareId(from, to) {
    let square = this.capturedSquare(from, to);
    return exists(square) ? square.id : null;
  }

  /**
   * Is the player in checkmate?
   * @param {number} playerNumber - The number of the player.
   * @return {boolean}
   */
  inCheckmate(playerNumber) {
    return (this.inCheck(playerNumber) || this.nonJiangPiecesCannotMove(playerNumber)) && this.jiangCannotMove(playerNumber);
  }

  /**
   * Is the player in check?
   * @param {number} playerNumber - The number of the player.
   * @return {boolean}
   */
  inCheck(playerNumber) {
    let jiangSquare = this.squares.findJiangForPlayer(playerNumber);
    let threatenedBy = this.squares.threatenedBy(this.opponentOf(playerNumber), this);
    return threatenedBy.includes(jiangSquare);
  }

  /**
   * Are non king pieces owned by the player unable to move?
   * @param {number} playerNumber - The number of the player.
   * @return {boolean}
   */
  nonJiangPiecesCannotMove(playerNumber) {
    return this.squares.occupiedByPlayer(playerNumber).excludingPiece('jiang').every((s) => {
      return s.piece.destinations(s, this).none();
    });
  }

  /**
   * Is the player's king unable to move?
   * @param {number} playerNumber - The number of the player.
   * @return {boolean}
   */
  jiangCannotMove(playerNumber) {
    let jiangSquare = this.squares.findJiangForPlayer(playerNumber);
    let destinations = jiangSquare.piece.destinations(jiangSquare, this);

    return destinations.every((d) => {
      let duplicate = this.dup;
      duplicate.move(jiangSquare.id, d.id);
      return duplicate.inCheck(playerNumber);
    });
  }

  /**
   * The winner of the game.
   * Returns null if no winner.
   * @return {(number|null)}
   */
  get winner() {
    if (this.inCheckmate(1)) {
      return 2;
    } else if (this.inCheckmate(2)) {
      return 1;
    } else {
      return null;
    }
  }

  /**
   * Duplicate the game state.
   * @return {GameState}
   */
  get dup() {
    return new GameState({
      current_player_number: this.currentPlayerNumber,
      squares: this.squares.asJson().squares,
    });
  }

  /**
   * Get the opponent of the player.
   * @return {number}
   */
  opponentOf(playerNumber) {
    return playerNumber === 1 ? 2 : 1;
  }

  /**
   * Get the opponent of the current player.
   * @return {number}
   */
  get opponent() {
    return this.opponentOf(this.currentPlayerNumber);
  }

  /**
   * Perform a simple move.
   * @param {Square} from - The origin square.
   * @param {Square} to - The destination square.
   * @param {Square} captured - The captured piece's square.
   * @return {boolean}
   */
  performMove(from, to, captured) {
    if (from.id != to.id) {
      if (exists(captured)) {
        captured.removePiece();
      }
      let fromPiece = from.piece;
      to.addPiece(fromPiece);
      from.removePiece();
      return true;
    } else {
      return false;
    }
  }

  /**
   * Perform a complete move.
   * @param {string} fromId - The origin square id.
   * @param {string} toId = The destination square id.
   * @return {boolean}
   */
  move(fromId, toId) {
    let from = this.squares.findById(fromId);
    let to = this.squares.findById(toId);

    if (exists(from) && exists(to)) {
      let capturedSquare = this.capturedSquare(from, to);
      this.performMove(from, to, capturedSquare);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Select a piece on the square.
   * @param {string} squareId - THe id of the square.
   * @return {boolean}
   */
  selectPiece(squareId) {
    let square = this.findSquare(squareId);
    if (exists(square)) {
      return square.select();
    } else {
      return false;
    }
  }

  /**
   * Deselect a piece on the square.
   * @param {string} squareId - THe id of the square.
   * @return {boolean}
   */
  deselectPiece(squareId) {
    let square = this.findSquare(squareId);
    if (exists(square)) {
      return square.deselect();
    } else {
      return false;
    }
  }

  /**
   * Pass the turn to the other player.
   * @return {boolean}
   */
  passTurn() {
    if (this.currentPlayerNumber == 1) {
      this.currentPlayerNumber = 2;
    } else {
      this.currentPlayerNumber = 1;
    }
    return true;
  }
}

export default GameState

