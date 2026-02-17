<template>
  <div ref="container" class="scene-container"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameLogic } from '../logic/GameLogic';
import gsap from 'gsap';

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

let gameLogic = new GameLogic();
let pieceMeshes: Map<string, THREE.Mesh> = new Map(); // Algebraic to Mesh mapping
let selectedSquare: string | null = null;
let legalMoves: string[] = [];
let squaresGroup: THREE.Group;

// Camera positioning
const WHITE_POS = new THREE.Vector3(0, 8, 8);
const BLACK_POS = new THREE.Vector3(0, 8, -8);
const LOOKAT = new THREE.Vector3(0, 0, 0);

const initScene = () => {
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
  container.value.appendChild(renderer.domElement);

  // Controls (Observer Mode)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enabled = false; // Start locked

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Placeholder Board
  createPlaceholderBoard();
  
  // Placeholder Pieces
  createPlaceholderPieces();

  animate();
};

const createPlaceholderBoard = () => {
  const boardSize = 8;
  squaresGroup = new THREE.Group();

  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const isWhite = (r + c) % 2 === 0;
      const material = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xdddddd : 0x222222,
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

const createPlaceholderPieces = () => {
  // Clear existing
  pieceMeshes.forEach(m => scene.remove(m));
  pieceMeshes.clear();

  const board = gameLogic.getBoard();
  board.forEach((row, r) => {
    row.forEach((piece, c) => {
      if (piece) {
        const file = String.fromCharCode(97 + c);
        const rank = 8 - r;
        const squareId = `${file}${rank}`;

        const geometry = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 20);
        const material = new THREE.MeshStandardMaterial({
          color: piece.color === 'w' ? 0xffffff : 0x333333,
          metalness: 0.4,
          roughness: 0.3
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(c - 3.5, 0.4, r - 3.5);
        mesh.castShadow = true;
        mesh.userData = { square: squareId, color: piece.color };
        
        scene.add(mesh);
        pieceMeshes.set(squareId, mesh);
      }
    });
  });
};

const onMouseDown = (event: MouseEvent) => {
  if (!props.isLocked) return; // Disable interaction in observer mode

  const bounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Check board squares first for target, then pieces for selection
  const intersects = raycaster.intersectObjects([...squaresGroup.children, ...pieceMeshes.values()]);
  if (intersects.length === 0) {
    cancelSelection();
    return;
  }

  const clickedObject = intersects[0].object;
  const squareId = clickedObject.name || (clickedObject as THREE.Mesh).userData.square;
  
  if (!squareId) return;

  if (selectedSquare) {
    if (squareId === selectedSquare) {
      cancelSelection();
    } else {
      // Try move
      const move = gameLogic.makeMove(selectedSquare, squareId);
      if (move) {
        animateMove(move);
        cancelSelection();
        
        // Emit turn change to parent for Auto-Rotate handling
        emit('turn-changed', gameLogic.getTurn());
      } else {
        // Recalculate or switch selection
        handleNewSelection(squareId);
      }
    }
  } else {
    handleNewSelection(squareId);
  }
};

const handleNewSelection = (squareId: string) => {
  const board = gameLogic.getBoard();
  const col = squareId.charCodeAt(0) - 97;
  const row = 8 - parseInt(squareId[1]);
  const piece = board[row][col];

  if (piece && piece.color === gameLogic.getTurn()) {
    selectedSquare = squareId;
    legalMoves = gameLogic.getLegalMoves(squareId);
    
    resetSquareHighlights();
    highlightSquare(squareId, 0x00ff00); // Select green
    legalMoves.forEach(m => highlightSquare(m, 0x00aaff)); // Targeted blue
  } else {
    cancelSelection();
  }
};

const onMouseMove = (event: MouseEvent) => {
  if (!props.isLocked || !selectedSquare) return;

  const bounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(squaresGroup.children);
  
  // Clear previous hover
  resetHovers();

  if (intersects.length > 0) {
    const squareId = intersects[0].object.name;
    if (squareId && legalMoves.includes(squareId)) {
      showHoverBorder(squareId);
    }
  }
};

const showHoverBorder = (squareId: string) => {
  const square = squaresGroup.children.find(s => s.name === squareId) as THREE.Mesh;
  if (square) {
    (square.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
    (square.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
  }
};

const resetHovers = () => {
  squaresGroup.children.forEach(s => {
    const squareId = s.name;
    const material = (s as THREE.Mesh).material as THREE.MeshStandardMaterial;

    if (squareId === selectedSquare) {
      // Restore Selected Color (Green)
      material.emissive.setHex(0x00ff00);
      material.emissiveIntensity = 0.5;
    } else if (legalMoves.includes(squareId)) {
      // Restore Legal Move Color (Blue)
      material.emissive.setHex(0x00aaff);
      material.emissiveIntensity = 0.5;
    } else {
      // Reset to Normal
      material.emissive.setHex(0x000000);
    }
  });
};

const cancelSelection = () => {
  selectedSquare = null;
  legalMoves = [];
  resetSquareHighlights();
};

const highlightSquare = (squareId: string, color: number) => {
  const square = squaresGroup.children.find(s => s.name === squareId) as THREE.Mesh;
  if (square) {
    (square.material as THREE.MeshStandardMaterial).emissive.setHex(color);
    (square.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
  }
};

const resetSquareHighlights = () => {
  squaresGroup.children.forEach(s => {
    const mesh = s as THREE.Mesh;
    (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
  });
};

const animateMove = (move: any) => {
  const { from, to, piece: pieceType, captured, flags } = move;
  const pieceMesh = pieceMeshes.get(from);
  if (!pieceMesh) return;

  const toCol = to.charCodeAt(0) - 97;
  const toRow = 8 - parseInt(to[1]);
  const targetPos = new THREE.Vector3(toCol - 3.5, 0.4, toRow - 3.5);

  // 1. Handle Capture (Jump Out)
  if (captured) {
    const capturedPiece = pieceMeshes.get(to);
    if (capturedPiece) {
      animateCapture(capturedPiece, to);
    }
  }

  // 2. Handle Castling (King Slides, Rook Jumps)
  if (flags.includes('k') || flags.includes('q')) {
    animateCastling(move, pieceMesh, targetPos);
    return;
  }

  // 3. Handle Knight (Jump)
  if (pieceType === 'n') {
    animateJump(pieceMesh, targetPos, from, to);
    return;
  }

  // 4. Standard Slide
  animateSlide(pieceMesh, targetPos, from, to);
};

const animateCapture = (mesh: THREE.Mesh, squareId: string) => {
  const isWhitePiece = mesh.userData.color === 'w';
  
  // If Player is White:
  //   - Black Graveyard (Captured Black pieces): Right-Side Bottom (x > 0, z > 0)
  //   - White Graveyard (Captured White pieces): Left-Side Top (x < 0, z < 0)
  // Just a simple heuristic for Phase 0 based on user request:
  // "Black Graveyard: Right side of board, bottom half" -> x > 4, z > 0
  
  const graveyardX = isWhitePiece ? -6 : 6; 
  const graveyardZ = isWhitePiece ? -2 : 2; 

  gsap.to(mesh.position, {
    duration: 0.8,
    x: graveyardX + (Math.random() - 0.5), 
    y: 0.2, // Land on table
    z: graveyardZ + (Math.random() - 0.5),
    
    keyframes: {
      "0%": { y: 0.4 },
      "50%": { y: 3 }, // High arc
      "100%": { y: 0.2 } // Land
    },
    ease: "power1.inOut"
  });
  
  pieceMeshes.delete(squareId);
};

const animateJump = (mesh: THREE.Mesh, targetPos: THREE.Vector3, from: string, to: string) => {
  gsap.to(mesh.position, {
    duration: 0.7,
    x: targetPos.x,
    z: targetPos.z,
    ease: "power1.inOut",
  });
  
  gsap.to(mesh.position, {
    duration: 0.35,
    y: 2.5,
    yoyo: true,
    repeat: 1,
    ease: "power2.out"
  });

  updatePieceMap(mesh, from, to);
};

const animateSlide = (mesh: THREE.Mesh, targetPos: THREE.Vector3, from: string, to: string) => {
  gsap.to(mesh.position, {
    duration: 0.5,
    x: targetPos.x,
    z: targetPos.z,
    ease: "power2.inOut"
  });
  updatePieceMap(mesh, from, to);
};

const animateCastling = (move: any, kingMesh: THREE.Mesh, kingTargetPos: THREE.Vector3) => {
  // 1. Move King (Slide)
  animateSlide(kingMesh, kingTargetPos, move.from, move.to);

  // 2. Find and Move Rook (Jump)
  const isKingside = move.flags.includes('k');
  const rank = move.color === 'w' ? '1' : '8';
  const rookFromSquare = isKingside ? `h${rank}` : `a${rank}`;
  const rookToSquare = isKingside ? `f${rank}` : `d${rank}`;

  const rookMesh = pieceMeshes.get(rookFromSquare);
  if (rookMesh) {
    const toCol = rookToSquare.charCodeAt(0) - 97;
    const toRow = 8 - parseInt(rookToSquare[1]);
    const rookTargetPos = new THREE.Vector3(toCol - 3.5, 0.4, toRow - 3.5);

    setTimeout(() => {
       animateJump(rookMesh, rookTargetPos, rookFromSquare, rookToSquare);
    }, 100);
  }
};

const updatePieceMap = (mesh: THREE.Mesh, from: string, to: string) => {
  pieceMeshes.delete(from);
  pieceMeshes.set(to, mesh);
  mesh.userData.square = to;
};

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
