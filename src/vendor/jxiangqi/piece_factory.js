import { exists } from './utils'
import Jiang from './pieces/jiang'
import Ju from './pieces/ju'
import Ma from './pieces/ma'
import Pao from './pieces/pao'
import Shi from './pieces/shi'
import Xiang from './pieces/xiang'
import Zu from './pieces/zu'

/** A piece generator */
class PieceFactory {
  /**
   * Create a Piece Factory
   * @params {Object} args - The properties of the piece.
   * @param {String} args.type - The type of the piece.
   */
  constructor(args) {
    this.args = args;
  }

  /**
   * Build a piece based on the args type.
   * @return {(Piece|null)}
   */
  get build() {
    if (exists(this.args)) {
      if (this.args.constructorName === 'Piece') {
        return this.args;
      } else {
        switch (this.args.type) {
          case 'jiang':
            return new Jiang(this.args);
          case 'ju':
            return new Ju(this.args);
          case 'ma':
            return new Ma(this.args);
          case 'pao':
            return new Pao(this.args);
          case 'shi':
            return new Shi(this.args);
          case 'xiang':
            return new Xiang(this.args);
          case 'zu':
            return new Zu(this.args);
          default:
            return null;
        }
      }
    } else {
      return null;
    }
  }
}

export default PieceFactory

