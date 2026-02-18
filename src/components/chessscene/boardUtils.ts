import * as THREE from 'three';

export const BOARD_SQUARE_ID_REGEX = /^[a-h][1-8]$/;

export const getSquarePosition = (squareId: string, y = 0.06) => {
  const col = squareId.charCodeAt(0) - 97;
  const row = 8 - parseInt(squareId.slice(1), 10);
  return new THREE.Vector3(col - 3.5, y, row - 3.5);
};

export const getSquareCenterPosition = (squareId: string) => {
  const col = squareId.charCodeAt(0) - 97;
  const row = 8 - parseInt(squareId.slice(1), 10);
  return new THREE.Vector3(col - 3.5, 0, row - 3.5);
};

export const resolveSquareIdFromObject = (object: THREE.Object3D): string | null => {
  if (BOARD_SQUARE_ID_REGEX.test(object.name)) {
    return object.name;
  }

  let current: THREE.Object3D | null = object;
  while (current) {
    const candidate = current.userData?.square;
    if (typeof candidate === 'string' && BOARD_SQUARE_ID_REGEX.test(candidate)) {
      return candidate;
    }
    current = current.parent;
  }

  return null;
};
