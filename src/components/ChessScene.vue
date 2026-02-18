<template>
  <div ref="container" class="scene-container">
    <MoveHistoryPanel
      :rows="moveHistoryRows"
      :can-undo="canUndo"
      @undo="handleUndo"
      @restart="handleRestart"
    />

    <KnightDebugPanel
      :black-scale="blackKnightScale"
      :black-offset-x="blackKnightOffsetX"
      :black-offset-y="blackKnightOffsetY"
      :black-offset-z="blackKnightOffsetZ"
      :white-scale="whiteKnightScale"
      :white-offset-x="whiteKnightOffsetX"
      :white-offset-y="whiteKnightOffsetY"
      :white-offset-z="whiteKnightOffsetZ"
      @black-scale="adjustBlackKnightScale"
      @black-offset-x="adjustBlackKnightOffsetX"
      @black-offset-y="adjustBlackKnightOffsetY"
      @black-offset-z="adjustBlackKnightOffsetZ"
      @white-scale="adjustWhiteKnightScale"
      @white-offset-x="adjustWhiteKnightOffsetX"
      @white-offset-y="adjustWhiteKnightOffsetY"
      @white-offset-z="adjustWhiteKnightOffsetZ"
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
import KnightDebugPanel from './chessscene/KnightDebugPanel.vue';
import { useMoveHistory } from './chessscene/useMoveHistory';
import { useKnightDebug } from './chessscene/useKnightDebug';
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

// Camera positioning
const WHITE_POS = new THREE.Vector3(0, 8, 8);
const BLACK_POS = new THREE.Vector3(0, 8, -8);
const LOOKAT = new THREE.Vector3(0, 0, 0);
const gameLogic = new GameLogic();
const assetManager = new AssetManager();
const { moveHistoryRows, canUndo, syncMoveHistory } = useMoveHistory(gameLogic);
const {
  blackKnightScale,
  blackKnightOffsetX,
  blackKnightOffsetY,
  blackKnightOffsetZ,
  whiteKnightScale,
  whiteKnightOffsetX,
  whiteKnightOffsetY,
  whiteKnightOffsetZ,
  adjustBlackKnightScale,
  adjustBlackKnightOffsetX,
  adjustBlackKnightOffsetY,
  adjustBlackKnightOffsetZ,
  adjustWhiteKnightScale,
  adjustWhiteKnightOffsetX,
  adjustWhiteKnightOffsetY,
  adjustWhiteKnightOffsetZ
} = useKnightDebug(() => updateKnightTransformsInScene());

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
        mesh.castShadow = true;
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
    squarePos.x + blackKnightOffsetX.value,
    blackKnightOffsetY.value,
    squarePos.z + blackKnightOffsetZ.value
  );
  pieceObject.scale.setScalar(blackKnightScale.value);
  pieceObject.rotation.set(BLACK_KNIGHT_ROT_X, BLACK_KNIGHT_ROT_Y, BLACK_KNIGHT_ROT_Z, 'ZYX');
};

const applyWhiteKnightTransform = (pieceObject: THREE.Object3D, squareId: string) => {
  const squarePos = getSquareCenterPosition(squareId);
  pieceObject.position.set(
    squarePos.x + whiteKnightOffsetX.value,
    whiteKnightOffsetY.value,
    squarePos.z + whiteKnightOffsetZ.value
  );
  pieceObject.scale.setScalar(whiteKnightScale.value);
  pieceObject.rotation.set(WHITE_KNIGHT_ROT_X, WHITE_KNIGHT_ROT_Y, WHITE_KNIGHT_ROT_Z, 'ZYX');
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

const rebuildGraveyardFromHistory = () => {
  const history = gameLogic.getHistory() as Array<{ color: string; captured?: string; to: string }>;
  const capturedCount = { w: 0, b: 0 };

  history.forEach((move) => {
    if (!move.captured) return;
    const capturedColor = move.color === PIECE_COLORS.WHITE ? PIECE_COLORS.BLACK : PIECE_COLORS.WHITE;
    const index = capturedColor === PIECE_COLORS.WHITE ? capturedCount.w++ : capturedCount.b++;
    const capturedPiece = createPieceObjectForSquare(move.captured, capturedColor, move.to);
    capturedPiece.position.copy(getGraveyardPosition(capturedColor, index));
    capturedPiece.userData.isCaptured = true;
    piecesGroup.add(capturedPiece);
  });
};

const updateKnightTransformsInScene = () => {
  pieceMeshes.forEach((pieceObject) => {
    const squareId = pieceObject.userData.square as string | undefined;
    if (!squareId) return;
    if (pieceObject.userData.modelType === 'blackKnightGlb') {
      applyBlackKnightTransform(pieceObject, squareId);
    } else if (pieceObject.userData.modelType === 'whiteKnightGlb') {
      applyWhiteKnightTransform(pieceObject, squareId);
    }
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

  if (pieceObject.userData.modelType === 'blackPawnGlb') {
    return new THREE.Vector3(
      col - 3.5 + BLACK_PAWN_OFFSET_X,
      BLACK_PAWN_OFFSET_Y,
      row - 3.5 + BLACK_PAWN_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'blackRookGlb') {
    return new THREE.Vector3(
      col - 3.5 + BLACK_ROOK_OFFSET_X,
      BLACK_ROOK_OFFSET_Y,
      row - 3.5 + BLACK_ROOK_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'whitePawnGlb') {
    return new THREE.Vector3(
      col - 3.5 + WHITE_PAWN_OFFSET_X,
      WHITE_PAWN_OFFSET_Y,
      row - 3.5 + WHITE_PAWN_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'whiteRookGlb') {
    return new THREE.Vector3(
      col - 3.5 + WHITE_ROOK_OFFSET_X,
      WHITE_ROOK_OFFSET_Y,
      row - 3.5 + WHITE_ROOK_OFFSET_Z
    );
  }

  if (pieceObject.userData.modelType === 'blackKnightGlb') {
    return new THREE.Vector3(
      col - 3.5 + blackKnightOffsetX.value,
      blackKnightOffsetY.value,
      row - 3.5 + blackKnightOffsetZ.value
    );
  }

  if (pieceObject.userData.modelType === 'whiteKnightGlb') {
    return new THREE.Vector3(
      col - 3.5 + whiteKnightOffsetX.value,
      whiteKnightOffsetY.value,
      row - 3.5 + whiteKnightOffsetZ.value
    );
  }

  return new THREE.Vector3(col - 3.5, 0.4, row - 3.5);
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
  blackGraveyardY: BLACK_GRAVEYARD_OFFSET_Y
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
