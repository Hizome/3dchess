<template>
  <div ref="container" class="scene-container">
    <MoveHistoryPanel
      :rows="moveHistoryRows"
      :can-undo="canUndo"
      @undo="handleUndo"
      @restart="handleRestart"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameLogic } from '../logic/GameLogic';
import { AssetManager } from '../utils/AssetManager';
import gsap from 'gsap';
import MoveHistoryPanel from './chessscene/MoveHistoryPanel.vue';
import { useMoveHistory } from './chessscene/useMoveHistory';
import { usePieceAnimation } from './chessscene/usePieceAnimation';
import { useMoveInteraction } from './chessscene/useMoveInteraction';
import {
  BLACK_GRAVEYARD_OFFSET_Y,
  BLACK_KNIGHT_ROT_X,
  BLACK_KNIGHT_ROT_Y,
  BLACK_KNIGHT_ROT_Z,
  BLACK_PAWN_OFFSET_X,
  BLACK_PAWN_OFFSET_Y,
  BLACK_PAWN_OFFSET_Z,
  BLACK_PAWN_SCALE,
  BLACK_ROOK_OFFSET_X,
  BLACK_ROOK_OFFSET_Y,
  BLACK_ROOK_OFFSET_Z,
  BLACK_ROOK_SCALE,
  BOARD_POS_Y,
  BOARD_SCALE,
  PIECE_COLORS,
  WHITE_GRAVEYARD_OFFSET_Y,
  WHITE_KNIGHT_ROT_X,
  WHITE_KNIGHT_ROT_Y,
  WHITE_KNIGHT_ROT_Z,
  WHITE_PAWN_OFFSET_X,
  WHITE_PAWN_OFFSET_Y,
  WHITE_PAWN_OFFSET_Z,
  WHITE_PAWN_SCALE,
  WHITE_ROOK_OFFSET_X,
  WHITE_ROOK_OFFSET_Y,
  WHITE_ROOK_OFFSET_Z,
  WHITE_ROOK_SCALE
} from './chessscene/pieceConstants';
import { getSquareCenterPosition, resolveSquareIdFromObject } from './chessscene/boardUtils';
import boardModelUrl from '../assets/Board.glb?url';
import blackPawnModelUrl from '../assets/bp.glb?url';
import whitePawnModelUrl from '../assets/wp.glb?url';
import blackRookModelUrl from '../assets/br.glb?url';
import whiteRookModelUrl from '../assets/wr.glb?url';
import blackKnightModelUrl from '../assets/bn.glb?url';
import whiteKnightModelUrl from '../assets/wn.glb?url';
import blackBishopModelUrl from '../assets/bb.glb?url';
import whiteBishopModelUrl from '../assets/wb.glb?url';
import blackKingModelUrl from '../assets/bk.glb?url';
import whiteKingModelUrl from '../assets/wk.glb?url';
import blackQueenModelUrl from '../assets/bq.glb?url';
import whiteQueenModelUrl from '../assets/wq.glb?url';

const props = defineProps<{
  playerColor: string;
  isLocked: boolean;
  autoRotate: boolean; // Not strictly needed if parent handles playerColor update, but good for explicit logic if we want local control
}>();

const emit = defineEmits<{
  (e: 'turn-changed', color: string): void;
}>();

const container = ref<HTMLElement | null>(null);
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let pieceMeshes: Map<string, THREE.Object3D> = new Map(); // Algebraic square to piece object mapping
let squaresGroup: THREE.Group;
let highlightGroup: THREE.Group;
let piecesGroup: THREE.Group;
let boardModel: THREE.Group | null = null;
let blackPawnTemplate: THREE.Group | null = null;
let whitePawnTemplate: THREE.Group | null = null;
let blackRookTemplate: THREE.Group | null = null;
let whiteRookTemplate: THREE.Group | null = null;
let blackKnightTemplate: THREE.Group | null = null;
let whiteKnightTemplate: THREE.Group | null = null;
let blackBishopTemplate: THREE.Group | null = null;
let whiteBishopTemplate: THREE.Group | null = null;
let blackKingTemplate: THREE.Group | null = null;
let whiteKingTemplate: THREE.Group | null = null;
let blackQueenTemplate: THREE.Group | null = null;
let whiteQueenTemplate: THREE.Group | null = null;

// Camera positioning
const WHITE_POS = new THREE.Vector3(0, 8, 8);
const BLACK_POS = new THREE.Vector3(0, 8, -8);
const LOOKAT = new THREE.Vector3(0, 0, 0);
const gameLogic = new GameLogic();
const assetManager = new AssetManager();
const { moveHistoryRows, canUndo, syncMoveHistory } = useMoveHistory(gameLogic);
const BLACK_KNIGHT_SCALE = 28;
const BLACK_KNIGHT_OFFSET_X = 3.45;
const BLACK_KNIGHT_OFFSET_Y = -1.1;
const BLACK_KNIGHT_OFFSET_Z = 2.45;
const WHITE_KNIGHT_SCALE = 28;
const WHITE_KNIGHT_OFFSET_X = 0.45;
const WHITE_KNIGHT_OFFSET_Y = -1.1;
const WHITE_KNIGHT_OFFSET_Z = -4.25;
const BLACK_BISHOP_SCALE = 28;
const BLACK_BISHOP_OFFSET_X = -3.5;
const BLACK_BISHOP_OFFSET_Y = -1.1;
const BLACK_BISHOP_OFFSET_Z = -1.45;
const WHITE_BISHOP_SCALE = 28;
const WHITE_BISHOP_OFFSET_X = 3.5;
const WHITE_BISHOP_OFFSET_Y = -1.1;
const WHITE_BISHOP_OFFSET_Z = 1.4;
const BLACK_KING_SCALE = 28;
const BLACK_KING_OFFSET_X = 0.05;
const BLACK_KING_OFFSET_Y = -1.1;
const BLACK_KING_OFFSET_Z = 3.5;
const BLACK_KING_ROT_X = 0;
const BLACK_KING_ROT_Y = 100;
const BLACK_KING_ROT_Z = 0;
const WHITE_KING_SCALE = 28;
const WHITE_KING_OFFSET_X = -0.05;
const WHITE_KING_OFFSET_Y = -1.1;
const WHITE_KING_OFFSET_Z = -3.5;
const WHITE_KING_ROT_X = 0;
const WHITE_KING_ROT_Y = 100;
const WHITE_KING_ROT_Z = 0;
const BLACK_QUEEN_SCALE = 28;
const BLACK_QUEEN_OFFSET_X = -3.45;
const BLACK_QUEEN_OFFSET_Y = -1.1;
const BLACK_QUEEN_OFFSET_Z = 0.55;
const WHITE_QUEEN_SCALE = 28;
const WHITE_QUEEN_OFFSET_X = 3.45;
const WHITE_QUEEN_OFFSET_Y = -1.1;
const WHITE_QUEEN_OFFSET_Z = -0.6;

const initScene = async () => {
  if (!container.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  if (props.playerColor === 'white') {
    camera.position.copy(WHITE_POS);
  } else {
    camera.position.copy(BLACK_POS);
  }
  camera.lookAt(LOOKAT);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.value.appendChild(renderer.domElement);

  // Controls (Observer Mode)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enabled = false; // Start locked

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xe8f2ff, 0x604c3f, 0.55);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
  keyLight.position.set(6, 12, 8);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xfff2e6, 0.55);
  fillLight.position.set(-8, 6, -6);
  scene.add(fillLight);

  // Board interaction layer + model visual
  createPlaceholderBoard();
  createHighlightLayer();
  piecesGroup = new THREE.Group();
  scene.add(piecesGroup);
  await loadBoardModel();
  await loadBlackPawnTemplate();
  await loadWhitePawnTemplate();
  await loadBlackRookTemplate();
  await loadWhiteRookTemplate();
  await loadBlackKnightTemplate();
  await loadWhiteKnightTemplate();
  await loadBlackBishopTemplate();
  await loadWhiteBishopTemplate();
  await loadBlackKingTemplate();
  await loadWhiteKingTemplate();
  await loadBlackQueenTemplate();
  await loadWhiteQueenTemplate();
  
  // Placeholder Pieces
  createPlaceholderPieces();
  syncMoveHistory();

  animate();
};

const handleUndo = () => {
  const undone = gameLogic.undoMove();
  if (!undone) return;

  cancelSelection();
  createPlaceholderPieces();
  syncMoveHistory();
  emit('turn-changed', gameLogic.getTurn());
};

const handleRestart = () => {
  gameLogic.resetGame();
  cancelSelection();
  createPlaceholderPieces();
  syncMoveHistory();
  emit('turn-changed', gameLogic.getTurn());
};

const loadBoardModel = async () => {
  try {
    boardModel = await assetManager.loadModel(boardModelUrl);
    boardModel.position.set(0, BOARD_POS_Y, 0);
    boardModel.scale.setScalar(BOARD_SCALE);
    boardModel.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
      }
    });
    scene.add(boardModel);
  } catch (err) {
    console.warn('Failed to load board model, fallback to placeholder board only.', err);
  }
};

const loadBlackPawnTemplate = async () => {
  try {
    blackPawnTemplate = await assetManager.loadModel(blackPawnModelUrl);
    blackPawnTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    blackPawnTemplate = null;
    console.warn('Failed to load black pawn model, fallback to placeholder piece.', err);
  }
};

const loadWhitePawnTemplate = async () => {
  try {
    whitePawnTemplate = await assetManager.loadModel(whitePawnModelUrl);
    whitePawnTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    whitePawnTemplate = null;
    console.warn('Failed to load white pawn model, fallback to placeholder piece.', err);
  }
};

const loadBlackRookTemplate = async () => {
  try {
    blackRookTemplate = await assetManager.loadModel(blackRookModelUrl);
    blackRookTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    blackRookTemplate = null;
    console.warn('Failed to load black rook model, fallback to placeholder piece.', err);
  }
};

const loadWhiteRookTemplate = async () => {
  try {
    whiteRookTemplate = await assetManager.loadModel(whiteRookModelUrl);
    whiteRookTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    whiteRookTemplate = null;
    console.warn('Failed to load white rook model, fallback to placeholder piece.', err);
  }
};

const loadBlackKnightTemplate = async () => {
  try {
    blackKnightTemplate = await assetManager.loadModel(blackKnightModelUrl);
    blackKnightTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    blackKnightTemplate = null;
    console.warn('Failed to load black knight model, fallback to placeholder piece.', err);
  }
};

const loadWhiteKnightTemplate = async () => {
  try {
    whiteKnightTemplate = await assetManager.loadModel(whiteKnightModelUrl);
    whiteKnightTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    whiteKnightTemplate = null;
    console.warn('Failed to load white knight model, fallback to placeholder piece.', err);
  }
};

const loadBlackBishopTemplate = async () => {
  try {
    blackBishopTemplate = await assetManager.loadModel(blackBishopModelUrl);
    blackBishopTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    blackBishopTemplate = null;
    console.warn('Failed to load black bishop model, fallback to placeholder piece.', err);
  }
};

const loadWhiteBishopTemplate = async () => {
  try {
    whiteBishopTemplate = await assetManager.loadModel(whiteBishopModelUrl);
    whiteBishopTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    whiteBishopTemplate = null;
    console.warn('Failed to load white bishop model, fallback to placeholder piece.', err);
  }
};

const loadBlackKingTemplate = async () => {
  try {
    blackKingTemplate = await assetManager.loadModel(blackKingModelUrl);
    blackKingTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    blackKingTemplate = null;
    console.warn('Failed to load black queen model, fallback to placeholder piece.', err);
  }
};

const loadWhiteKingTemplate = async () => {
  try {
    whiteKingTemplate = await assetManager.loadModel(whiteKingModelUrl);
    whiteKingTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    whiteKingTemplate = null;
    console.warn('Failed to load white queen model, fallback to placeholder piece.', err);
  }
};

const loadBlackQueenTemplate = async () => {
  try {
    blackQueenTemplate = await assetManager.loadModel(blackQueenModelUrl);
    blackQueenTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    blackQueenTemplate = null;
    console.warn('Failed to load black queen model, fallback to placeholder piece.', err);
  }
};

const loadWhiteQueenTemplate = async () => {
  try {
    whiteQueenTemplate = await assetManager.loadModel(whiteQueenModelUrl);
    whiteQueenTemplate.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  } catch (err) {
    whiteQueenTemplate = null;
    console.warn('Failed to load white queen model, fallback to placeholder piece.', err);
  }
};

const applyBlackPawnTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + BLACK_PAWN_OFFSET_X,
    BLACK_PAWN_OFFSET_Y,
    squarePos.z + BLACK_PAWN_OFFSET_Z
  );
  pieceObject.scale.setScalar(BLACK_PAWN_SCALE);
};

const applyWhitePawnTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + WHITE_PAWN_OFFSET_X,
    WHITE_PAWN_OFFSET_Y,
    squarePos.z + WHITE_PAWN_OFFSET_Z
  );
  pieceObject.scale.setScalar(WHITE_PAWN_SCALE);
};

const applyWhiteRookTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + WHITE_ROOK_OFFSET_X,
    WHITE_ROOK_OFFSET_Y,
    squarePos.z + WHITE_ROOK_OFFSET_Z
  );
  pieceObject.scale.setScalar(WHITE_ROOK_SCALE);
};

const applyBlackRookTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + BLACK_ROOK_OFFSET_X,
    BLACK_ROOK_OFFSET_Y,
    squarePos.z + BLACK_ROOK_OFFSET_Z
  );
  pieceObject.scale.setScalar(BLACK_ROOK_SCALE);
};

const applyBlackKnightTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + BLACK_KNIGHT_OFFSET_X,
    BLACK_KNIGHT_OFFSET_Y,
    squarePos.z + BLACK_KNIGHT_OFFSET_Z
  );
  pieceObject.scale.setScalar(BLACK_KNIGHT_SCALE);
  pieceObject.rotation.set(BLACK_KNIGHT_ROT_X, BLACK_KNIGHT_ROT_Y, BLACK_KNIGHT_ROT_Z, 'ZYX');
};

const applyWhiteKnightTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + WHITE_KNIGHT_OFFSET_X,
    WHITE_KNIGHT_OFFSET_Y,
    squarePos.z + WHITE_KNIGHT_OFFSET_Z
  );
  pieceObject.scale.setScalar(WHITE_KNIGHT_SCALE);
  pieceObject.rotation.set(WHITE_KNIGHT_ROT_X, WHITE_KNIGHT_ROT_Y, WHITE_KNIGHT_ROT_Z, 'ZYX');
};

const applyBlackBishopTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + BLACK_BISHOP_OFFSET_X,
    BLACK_BISHOP_OFFSET_Y,
    squarePos.z + BLACK_BISHOP_OFFSET_Z
  );
  pieceObject.scale.setScalar(BLACK_BISHOP_SCALE);
};

const applyWhiteBishopTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + WHITE_BISHOP_OFFSET_X,
    WHITE_BISHOP_OFFSET_Y,
    squarePos.z + WHITE_BISHOP_OFFSET_Z
  );
  pieceObject.scale.setScalar(WHITE_BISHOP_SCALE);
};

const applyBlackKingTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + BLACK_KING_OFFSET_X,
    BLACK_KING_OFFSET_Y,
    squarePos.z + BLACK_KING_OFFSET_Z
  );
  pieceObject.scale.setScalar(BLACK_KING_SCALE);
  pieceObject.rotation.set(
    THREE.MathUtils.degToRad(BLACK_KING_ROT_X),
    THREE.MathUtils.degToRad(BLACK_KING_ROT_Y),
    THREE.MathUtils.degToRad(BLACK_KING_ROT_Z),
    'ZYX'
  );
};

const applyWhiteKingTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + WHITE_KING_OFFSET_X,
    WHITE_KING_OFFSET_Y,
    squarePos.z + WHITE_KING_OFFSET_Z
  );
  pieceObject.scale.setScalar(WHITE_KING_SCALE);
  pieceObject.rotation.set(
    THREE.MathUtils.degToRad(WHITE_KING_ROT_X),
    THREE.MathUtils.degToRad(WHITE_KING_ROT_Y),
    THREE.MathUtils.degToRad(WHITE_KING_ROT_Z),
    'ZYX'
  );
};

const applyBlackQueenTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + BLACK_QUEEN_OFFSET_X,
    BLACK_QUEEN_OFFSET_Y,
    squarePos.z + BLACK_QUEEN_OFFSET_Z
  );
  pieceObject.scale.setScalar(BLACK_QUEEN_SCALE);
};

const applyWhiteQueenTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + WHITE_QUEEN_OFFSET_X,
    WHITE_QUEEN_OFFSET_Y,
    squarePos.z + WHITE_QUEEN_OFFSET_Z
  );
  pieceObject.scale.setScalar(WHITE_QUEEN_SCALE);
};

const createPieceObjectForSquare = (pieceType: string, pieceColor: string, squareId: string): THREE.Object3D => {
  let pieceObject: THREE.Object3D;

  if (pieceColor === 'b' && pieceType === 'p' && blackPawnTemplate) {
    pieceObject = blackPawnTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackPawnGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackPawnGlb' };
    });
    applyBlackPawnTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'b' && pieceType === 'r' && blackRookTemplate) {
    pieceObject = blackRookTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackRookGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackRookGlb' };
    });
    applyBlackRookTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'w' && pieceType === 'p' && whitePawnTemplate) {
    pieceObject = whitePawnTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whitePawnGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whitePawnGlb' };
    });
    applyWhitePawnTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'w' && pieceType === 'r' && whiteRookTemplate) {
    pieceObject = whiteRookTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteRookGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteRookGlb' };
    });
    applyWhiteRookTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'b' && pieceType === 'n' && blackKnightTemplate) {
    pieceObject = blackKnightTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackKnightGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackKnightGlb' };
    });
    applyBlackKnightTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'w' && pieceType === 'n' && whiteKnightTemplate) {
    pieceObject = whiteKnightTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteKnightGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteKnightGlb' };
    });
    applyWhiteKnightTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'b' && pieceType === 'b' && blackBishopTemplate) {
    pieceObject = blackBishopTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackBishopGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackBishopGlb' };
    });
    applyBlackBishopTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'w' && pieceType === 'b' && whiteBishopTemplate) {
    pieceObject = whiteBishopTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteBishopGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteBishopGlb' };
    });
    applyWhiteBishopTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'b' && pieceType === 'k' && blackKingTemplate) {
    pieceObject = blackKingTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackKingGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackKingGlb' };
    });
    applyBlackKingTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'w' && pieceType === 'k' && whiteKingTemplate) {
    pieceObject = whiteKingTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteKingGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteKingGlb' };
    });
    applyWhiteKingTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'b' && pieceType === 'q' && blackQueenTemplate) {
    pieceObject = blackQueenTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackQueenGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'blackQueenGlb' };
    });
    applyBlackQueenTransform(pieceObject, squareId);
    return pieceObject;
  }

  if (pieceColor === 'w' && pieceType === 'q' && whiteQueenTemplate) {
    pieceObject = whiteQueenTemplate.clone(true);
    pieceObject.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteQueenGlb' };
    pieceObject.traverse((obj) => {
      obj.userData = { square: squareId, color: pieceColor, type: pieceType, modelType: 'whiteQueenGlb' };
    });
    applyWhiteQueenTransform(pieceObject, squareId);
    return pieceObject;
  }

  const geometry = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 20);
  const material = new THREE.MeshStandardMaterial({
    color: pieceColor === PIECE_COLORS.WHITE ? 0xffffff : 0x333333,
    metalness: 0.4,
    roughness: 0.3
  });
  const mesh = new THREE.Mesh(geometry, material);
  const col = squareId.charCodeAt(0) - 97;
  const row = 8 - parseInt(squareId.slice(1), 10);
  mesh.position.set(col - 3.5, 0.4, row - 3.5);
  mesh.castShadow = true;
  mesh.userData = { square: squareId, color: pieceColor, type: pieceType };
  return mesh;
};

const getGraveyardPosition = (capturedColor: string, capturedIndex: number) => {
  const isWhitePiece = capturedColor === PIECE_COLORS.WHITE;
  const baseX = isWhitePiece ? -6 : 6;
  const baseZ = isWhitePiece ? -2 : 2;
  const col = capturedIndex % 4;
  const row = Math.floor(capturedIndex / 4);
  const x = baseX + (col - 1.5) * 0.45;
  const zDirection = isWhitePiece ? -1 : 1;
  const z = baseZ + row * 0.45 * zDirection;
  const y = isWhitePiece ? WHITE_GRAVEYARD_OFFSET_Y : BLACK_GRAVEYARD_OFFSET_Y;
  return new THREE.Vector3(x, y, z);
};

const getAdjustedGraveyardPositionForPiece = (pieceObject: THREE.Object3D, basePosition: THREE.Vector3) => {
  const adjusted = basePosition.clone();
  if (pieceObject.userData.modelType === 'blackKnightGlb') {
    adjusted.x += BLACK_KNIGHT_OFFSET_X;
    adjusted.z += BLACK_KNIGHT_OFFSET_Z;
  }
  return adjusted;
};

const getCaptureGraveyardPositionForPiece = (pieceObject: THREE.Object3D) => {
  const capturedColor = pieceObject.userData.color === PIECE_COLORS.WHITE ? PIECE_COLORS.WHITE : PIECE_COLORS.BLACK;
  const baseX = capturedColor === PIECE_COLORS.WHITE ? -6 : 6;
  const baseZ = capturedColor === PIECE_COLORS.WHITE ? -2 : 2;
  const baseY = capturedColor === PIECE_COLORS.WHITE ? WHITE_GRAVEYARD_OFFSET_Y : BLACK_GRAVEYARD_OFFSET_Y;
  const basePosition = new THREE.Vector3(baseX + (Math.random() - 0.5), baseY, baseZ + (Math.random() - 0.5));
  return getAdjustedGraveyardPositionForPiece(pieceObject, basePosition);
};

const rebuildGraveyardFromHistory = () => {
  const history = gameLogic.getHistory() as Array<{ color: string; captured?: string; to: string }>;
  const capturedCount = { w: 0, b: 0 };

  history.forEach((move) => {
    if (!move.captured) return;
    const capturedColor = move.color === PIECE_COLORS.WHITE ? PIECE_COLORS.BLACK : PIECE_COLORS.WHITE;
    const index = capturedColor === PIECE_COLORS.WHITE ? capturedCount.w++ : capturedCount.b++;
    const capturedPiece = createPieceObjectForSquare(move.captured, capturedColor, move.to);
    const basePosition = getGraveyardPosition(capturedColor, index);
    capturedPiece.position.copy(getAdjustedGraveyardPositionForPiece(capturedPiece, basePosition));
    capturedPiece.userData.isCaptured = true;
    piecesGroup.add(capturedPiece);
  });
};

const createPlaceholderBoard = () => {
  const boardSize = 8;
  squaresGroup = new THREE.Group();

  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const isWhite = (r + c) % 2 === 0;
      const material = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xffffff : 0x000000,
        transparent: true,
        opacity: 0.05,
      });
      const square = new THREE.Mesh(geometry, material);
      square.rotation.x = -Math.PI / 2;
      square.position.set(c - 3.5, 0, r - 3.5);
      square.receiveShadow = true;
      
      const file = String.fromCharCode(97 + c);
      const rank = 8 - r;
      square.name = `${file}${rank}`; // e.g., "e4"
      
      squaresGroup.add(square);
    }
  }
  scene.add(squaresGroup);
};

const createHighlightLayer = () => {
  highlightGroup = new THREE.Group();
  scene.add(highlightGroup);
};

const getTargetPositionForPiece = (pieceObject: THREE.Object3D, squareId: string) => {
  const col = squareId.charCodeAt(0) - 97;
  const row = 8 - parseInt(squareId.slice(1), 10);
  const baseX = col - 3.5;

  if (pieceObject.userData.modelType === 'blackPawnGlb') {
    return new THREE.Vector3(
      baseX + BLACK_PAWN_OFFSET_X,
      BLACK_PAWN_OFFSET_Y,
      row - 3.5 + BLACK_PAWN_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'blackRookGlb') {
    return new THREE.Vector3(
      baseX + BLACK_ROOK_OFFSET_X,
      BLACK_ROOK_OFFSET_Y,
      row - 3.5 + BLACK_ROOK_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'whitePawnGlb') {
    return new THREE.Vector3(
      baseX + WHITE_PAWN_OFFSET_X,
      WHITE_PAWN_OFFSET_Y,
      row - 3.5 + WHITE_PAWN_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'whiteRookGlb') {
    return new THREE.Vector3(
      baseX + WHITE_ROOK_OFFSET_X,
      WHITE_ROOK_OFFSET_Y,
      row - 3.5 + WHITE_ROOK_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'blackKnightGlb') {
    return new THREE.Vector3(
      baseX + BLACK_KNIGHT_OFFSET_X,
      BLACK_KNIGHT_OFFSET_Y,
      row - 3.5 + BLACK_KNIGHT_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'whiteKnightGlb') {
    return new THREE.Vector3(
      baseX + WHITE_KNIGHT_OFFSET_X,
      WHITE_KNIGHT_OFFSET_Y,
      row - 3.5 + WHITE_KNIGHT_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'blackBishopGlb') {
    return new THREE.Vector3(
      baseX + BLACK_BISHOP_OFFSET_X,
      BLACK_BISHOP_OFFSET_Y,
      row - 3.5 + BLACK_BISHOP_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'whiteBishopGlb') {
    return new THREE.Vector3(
      baseX + WHITE_BISHOP_OFFSET_X,
      WHITE_BISHOP_OFFSET_Y,
      row - 3.5 + WHITE_BISHOP_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'blackKingGlb') {
    return new THREE.Vector3(
      baseX + BLACK_KING_OFFSET_X,
      BLACK_KING_OFFSET_Y,
      row - 3.5 + BLACK_KING_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'whiteKingGlb') {
    return new THREE.Vector3(
      baseX + WHITE_KING_OFFSET_X,
      WHITE_KING_OFFSET_Y,
      row - 3.5 + WHITE_KING_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'blackQueenGlb') {
    return new THREE.Vector3(
      baseX + BLACK_QUEEN_OFFSET_X,
      BLACK_QUEEN_OFFSET_Y,
      row - 3.5 + BLACK_QUEEN_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'whiteQueenGlb') {
    return new THREE.Vector3(
      baseX + WHITE_QUEEN_OFFSET_X,
      WHITE_QUEEN_OFFSET_Y,
      row - 3.5 + WHITE_QUEEN_OFFSET_Z
    );
  }

  return new THREE.Vector3(baseX, 0.4, row - 3.5);
};

const createPlaceholderPieces = () => {
  // Clear existing rendered pieces, including captured ones in graveyard.
  pieceMeshes.clear();
  while (piecesGroup.children.length > 0) {
    const child = piecesGroup.children[0];
    if (!child) break;
    piecesGroup.remove(child);
  }

  const board = gameLogic.getBoard();
  board.forEach((row, r) => {
    row.forEach((piece, c) => {
      if (piece) {
        const file = String.fromCharCode(97 + c);
        const rank = 8 - r;
        const squareId = `${file}${rank}`;
        const pieceObject = createPieceObjectForSquare(piece.type, piece.color, squareId);
        piecesGroup.add(pieceObject);
        pieceMeshes.set(squareId, pieceObject);
      }
    });
  });

  rebuildGraveyardFromHistory();
};

const { animateMove } = usePieceAnimation({
  pieceMeshes,
  getTargetPositionForPiece,
  whiteGraveyardY: WHITE_GRAVEYARD_OFFSET_Y,
  blackGraveyardY: BLACK_GRAVEYARD_OFFSET_Y,
  getCaptureGraveyardPosition: getCaptureGraveyardPositionForPiece
});

const { onMouseDown, onMouseMove, cancelSelection } = useMoveInteraction({
  gameLogic,
  pieceMeshes,
  mouse,
  raycaster,
  getRenderer: () => renderer,
  getCamera: () => camera,
  getControls: () => controls,
  getSquaresGroup: () => squaresGroup,
  getHighlightGroup: () => highlightGroup,
  isLocked: () => props.isLocked,
  resolveSquareIdFromObject,
  onMoveApplied: (move) => {
    animateMove(move);
    syncMoveHistory();
    emit('turn-changed', gameLogic.getTurn());
  }
});

const resetCameraPosition = () => {
  const targetPos = props.playerColor === 'white' ? WHITE_POS : BLACK_POS;
  const startPos = camera.position.clone();
  
  // Heuristic: Check if we are "crossing" sides.
  const isCrossing = Math.sign(startPos.z) !== Math.sign(targetPos.z);
  
  if (isCrossing && Math.abs(startPos.z) > 1) {
    // Circular Animation using proxy object
    const proxy = { t: 0 };
    
    gsap.to(proxy, {
      duration: 1.5,
      t: 1,
      ease: "power2.inOut",
      onUpdate: () => {
        const t = proxy.t;
        // Use a sin offset for X to create an arc (swing around side)
        const xOffset = Math.sin(t * Math.PI) * 10; 
        
        camera.position.x = THREE.MathUtils.lerp(startPos.x, targetPos.x, t) + xOffset;
        camera.position.z = THREE.MathUtils.lerp(startPos.z, targetPos.z, t);
        camera.position.y = THREE.MathUtils.lerp(startPos.y, targetPos.y, t);
        
        camera.lookAt(LOOKAT);
      }
    });
  } else {
    // Standard Linear (small adjustments)
    gsap.to(camera.position, {
      duration: 1.0,
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      ease: "power2.inOut",
      onUpdate: () => camera.lookAt(LOOKAT)
    });
  }
};

// React to lock toggle
watch(() => props.isLocked, (locked) => {
  if (locked) {
    controls.enabled = false;
    resetCameraPosition();
  } else {
    controls.enabled = true;
  }
});

// React to dynamic playerColor change (Locked view switching / Auto-Rotate)
watch(() => props.playerColor, () => {
  if (props.isLocked) {
    resetCameraPosition();
  }
});

const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

const handleResize = () => {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

onMounted(() => {
  initScene();
  window.addEventListener('resize', handleResize);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  renderer.domElement.removeEventListener('mousedown', onMouseDown);
  renderer.domElement.removeEventListener('mousemove', onMouseMove);
  renderer.dispose();
});
</script>

<style scoped>
.scene-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
}

canvas {
  display: block;
}
</style>
