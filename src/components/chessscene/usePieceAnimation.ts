import * as THREE from 'three';
import gsap from 'gsap';

export type ChessMove = {
  from: string;
  to: string;
  piece: string;
  captured?: string;
  flags: string;
  color: string;
};

type UsePieceAnimationOptions = {
  pieceMeshes: Map<string, THREE.Object3D>;
  getTargetPositionForPiece: (pieceObject: THREE.Object3D, squareId: string) => THREE.Vector3;
  whiteGraveyardY: number;
  blackGraveyardY: number;
};

export const usePieceAnimation = ({
  pieceMeshes,
  getTargetPositionForPiece,
  whiteGraveyardY,
  blackGraveyardY
}: UsePieceAnimationOptions) => {
  const updatePieceMap = (mesh: THREE.Object3D, from: string, to: string) => {
    pieceMeshes.delete(from);
    pieceMeshes.set(to, mesh);
    mesh.userData.square = to;
    mesh.traverse((obj) => {
      obj.userData.square = to;
    });
  };

  const animateCapture = (mesh: THREE.Object3D, squareId: string) => {
    const isWhitePiece = mesh.userData.color === 'w';
    const graveyardX = isWhitePiece ? -6 : 6;
    const graveyardZ = isWhitePiece ? -2 : 2;
    const graveyardY = isWhitePiece ? whiteGraveyardY : blackGraveyardY;

    gsap.to(mesh.position, {
      duration: 0.8,
      x: graveyardX + (Math.random() - 0.5),
      y: graveyardY,
      z: graveyardZ + (Math.random() - 0.5),
      keyframes: {
        '0%': { y: mesh.position.y },
        '50%': { y: 3 },
        '100%': { y: graveyardY }
      },
      ease: 'power1.inOut'
    });

    pieceMeshes.delete(squareId);
  };

  const animateJump = (mesh: THREE.Object3D, targetPos: THREE.Vector3, from: string, to: string) => {
    gsap.to(mesh.position, {
      duration: 0.7,
      x: targetPos.x,
      z: targetPos.z,
      ease: 'power1.inOut'
    });

    gsap.to(mesh.position, {
      duration: 0.35,
      y: 2.5,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out'
    });

    updatePieceMap(mesh, from, to);
  };

  const animateSlide = (mesh: THREE.Object3D, targetPos: THREE.Vector3, from: string, to: string) => {
    gsap.to(mesh.position, {
      duration: 0.5,
      x: targetPos.x,
      z: targetPos.z,
      ease: 'power2.inOut'
    });
    updatePieceMap(mesh, from, to);
  };

  const animateCastling = (move: ChessMove, kingMesh: THREE.Object3D, kingTargetPos: THREE.Vector3) => {
    animateSlide(kingMesh, kingTargetPos, move.from, move.to);

    const isKingside = move.flags.includes('k');
    const rank = move.color === 'w' ? '1' : '8';
    const rookFromSquare = isKingside ? `h${rank}` : `a${rank}`;
    const rookToSquare = isKingside ? `f${rank}` : `d${rank}`;

    const rookMesh = pieceMeshes.get(rookFromSquare);
    if (rookMesh) {
      const rookTargetPos = getTargetPositionForPiece(rookMesh, rookToSquare);
      setTimeout(() => {
        animateJump(rookMesh, rookTargetPos, rookFromSquare, rookToSquare);
      }, 100);
    }
  };

  const animateMove = (move: ChessMove) => {
    const { from, to, piece: pieceType, captured, flags } = move;
    const pieceMesh = pieceMeshes.get(from);
    if (!pieceMesh) return;

    const targetPos = getTargetPositionForPiece(pieceMesh, to);

    if (captured) {
      const capturedPiece = pieceMeshes.get(to);
      if (capturedPiece) {
        animateCapture(capturedPiece, to);
      }
    }

    if (flags.includes('k') || flags.includes('q')) {
      animateCastling(move, pieceMesh, targetPos);
      return;
    }

    if (pieceType === 'n') {
      animateJump(pieceMesh, targetPos, from, to);
      return;
    }

    animateSlide(pieceMesh, targetPos, from, to);
  };

  return {
    animateMove
  };
};
