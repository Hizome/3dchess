import * as THREE from 'three';

export const BOARD_SCALE = 28;
export const BOARD_POS_Y = -1.1;

export const BLACK_PAWN_SCALE = 28;
export const BLACK_PAWN_OFFSET_X = -2.45;
export const BLACK_PAWN_OFFSET_Y = -1.1;
export const BLACK_PAWN_OFFSET_Z = 1.55;

export const WHITE_PAWN_SCALE = 28;
export const WHITE_PAWN_OFFSET_X = 2.45;
export const WHITE_PAWN_OFFSET_Y = -1.1;
export const WHITE_PAWN_OFFSET_Z = 1.4;

export const BLACK_ROOK_SCALE = 28;
export const BLACK_ROOK_OFFSET_X = -3.5;
export const BLACK_ROOK_OFFSET_Y = -1.1;
export const BLACK_ROOK_OFFSET_Z = 3.55;

export const WHITE_ROOK_SCALE = 28;
export const WHITE_ROOK_OFFSET_X = 3.45;
export const WHITE_ROOK_OFFSET_Y = -1.1;
export const WHITE_ROOK_OFFSET_Z = 3.4;

export const BLACK_GRAVEYARD_OFFSET_Y = -1.1;
export const WHITE_GRAVEYARD_OFFSET_Y = BLACK_GRAVEYARD_OFFSET_Y;

export const BLACK_KNIGHT_ROT_Z = THREE.MathUtils.degToRad(0);
export const BLACK_KNIGHT_ROT_Y = THREE.MathUtils.degToRad(110);
export const BLACK_KNIGHT_ROT_X = THREE.MathUtils.degToRad(0);

export const WHITE_KNIGHT_ROT_Z = THREE.MathUtils.degToRad(0);
export const WHITE_KNIGHT_ROT_Y = THREE.MathUtils.degToRad(-240);
export const WHITE_KNIGHT_ROT_X = THREE.MathUtils.degToRad(0);

export const PIECE_COLORS = { WHITE: 'w', BLACK: 'b' } as const;
