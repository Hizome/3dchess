<template>
  <div ref="container" class="scene-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { XiangqiGameLogic } from '../logic/XiangqiGameLogic';

const props = defineProps<{
  playerColor: string;
  isLocked: boolean;
  autoRotate: boolean;
}>();

const emit = defineEmits<{
  (e: 'turn-changed', color: string): void;
}>();

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as const;

const container = ref<HTMLElement | null>(null);
const gameLogic = new XiangqiGameLogic();

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let boardGroup: THREE.Group;
let piecesGroup: THREE.Group;
let interactionGroup: THREE.Group;
let highlightGroup: THREE.Group;
let selectedIndicator: THREE.Mesh | null = null;
const legalIndicators: THREE.Mesh[] = [];
const pieceMeshes: Map<string, THREE.Object3D> = new Map();
const capturedCount = { w: 0, b: 0 };
let selectedSquare: string | null = null;
let legalMoves: string[] = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const WHITE_POS = new THREE.Vector3(0, 10, 11);
const BLACK_POS = new THREE.Vector3(0, 10, -11);
const LOOKAT = new THREE.Vector3(0, 0, 0);

const RED_PIECE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xb73333,
  metalness: 0.25,
  roughness: 0.45
});

const BLACK_PIECE_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x252525,
  metalness: 0.2,
  roughness: 0.5
});

const squareIdFrom = (fileIndex: number, rank: number) => `${FILES[fileIndex]}${rank}`;

const parseSquareId = (squareId: string) => {
  const file = squareId.charCodeAt(0) - 97;
  const rank = Number(squareId.slice(1));
  return { file, rank };
};

const toWorldPositionBySquareId = (squareId: string, y = 0.25) => {
  const { file, rank } = parseSquareId(squareId);
  return new THREE.Vector3(file - 4, y, 5.5 - rank);
};

const createBoard = () => {
  boardGroup = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10.6, 0.6, 11.6),
    new THREE.MeshStandardMaterial({ color: 0x6f4b2f, roughness: 0.75 })
  );
  base.position.y = -0.35;
  base.castShadow = false;
  base.receiveShadow = true;
  boardGroup.add(base);

  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 10.5),
    new THREE.MeshStandardMaterial({ color: 0xc7965e, roughness: 0.9 })
  );
  top.rotation.x = -Math.PI / 2;
  top.castShadow = false;
  top.receiveShadow = true;
  boardGroup.add(top);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x2c1c11 });
  const halfRiver = 0.5;
  const zMin = -4.5;
  const zMax = 4.5;

  for (let x = -4; x <= 4; x += 1) {
    const riverTop = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.01, zMin),
      new THREE.Vector3(x, 0.01, -halfRiver)
    ]);
    boardGroup.add(new THREE.Line(riverTop, lineMaterial));

    const riverBottom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.01, halfRiver),
      new THREE.Vector3(x, 0.01, zMax)
    ]);
    boardGroup.add(new THREE.Line(riverBottom, lineMaterial));
  }

  for (let z = -4.5; z <= 4.5; z += 1) {
    const row = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-4, 0.01, z),
      new THREE.Vector3(4, 0.01, z)
    ]);
    boardGroup.add(new THREE.Line(row, lineMaterial));
  }

  const palaceLines: Array<[THREE.Vector3, THREE.Vector3]> = [
    [new THREE.Vector3(-1, 0.01, -4.5), new THREE.Vector3(1, 0.01, -2.5)],
    [new THREE.Vector3(1, 0.01, -4.5), new THREE.Vector3(-1, 0.01, -2.5)],
    [new THREE.Vector3(-1, 0.01, 2.5), new THREE.Vector3(1, 0.01, 4.5)],
    [new THREE.Vector3(1, 0.01, 2.5), new THREE.Vector3(-1, 0.01, 4.5)]
  ];

  palaceLines.forEach(([a, b]) => {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    boardGroup.add(new THREE.Line(geo, lineMaterial));
  });

  scene.add(boardGroup);
};

const createInteractionLayer = () => {
  interactionGroup = new THREE.Group();

  for (let rank = 1; rank <= 10; rank += 1) {
    for (let file = 0; file < 9; file += 1) {
      const squareId = squareIdFrom(file, rank);
      const marker = new THREE.Mesh(
        new THREE.CircleGeometry(0.28, 20),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.01, depthWrite: false })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.copy(toWorldPositionBySquareId(squareId, 0.03));
      marker.name = squareId;
      marker.userData.square = squareId;
      interactionGroup.add(marker);
    }
  }

  scene.add(interactionGroup);
};

const createHighlightLayer = () => {
  highlightGroup = new THREE.Group();
  scene.add(highlightGroup);
};

const getGraveyardPosition = (capturedColor: 'w' | 'b', capturedIndex: number) => {
  const isRedPiece = capturedColor === 'w';
  const baseX = isRedPiece ? -6 : 6;
  const baseZ = isRedPiece ? -2 : 2;
  const col = capturedIndex % 4;
  const row = Math.floor(capturedIndex / 4);
  const zDirection = isRedPiece ? -1 : 1;

  return new THREE.Vector3(baseX + (col - 1.5) * 0.45, 0.25, baseZ + row * 0.45 * zDirection);
};

const clearHighlights = () => {
  if (selectedIndicator) {
    gsap.killTweensOf(selectedIndicator.scale);
    highlightGroup.remove(selectedIndicator);
    selectedIndicator.geometry.dispose();
    (selectedIndicator.material as THREE.Material).dispose();
    selectedIndicator = null;
  }

  legalIndicators.forEach((mesh) => {
    gsap.killTweensOf(mesh.scale);
    highlightGroup.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  legalIndicators.length = 0;
};

const createRingIndicator = (squareId: string, color: number) => {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 36),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(toWorldPositionBySquareId(squareId, 0.05));
  return mesh;
};

const createDotIndicator = (squareId: string, color: number) => {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(toWorldPositionBySquareId(squareId, 0.05));
  return mesh;
};

const showSelectionHighlights = (squareId: string, moves: string[]) => {
  clearHighlights();

  selectedIndicator = createRingIndicator(squareId, 0x2dff8e);
  highlightGroup.add(selectedIndicator);
  gsap.to(selectedIndicator.scale, {
    duration: 0.9,
    x: 1.08,
    y: 1.08,
    z: 1.08,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });

  moves.forEach((moveSquare) => {
    const dot = createDotIndicator(moveSquare, 0x1dc7ff);
    highlightGroup.add(dot);
    legalIndicators.push(dot);
    gsap.to(dot.scale, {
      duration: 1.1,
      x: 1.12,
      y: 1.12,
      z: 1.12,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  });
};

const rebuildPieces = () => {
  pieceMeshes.clear();
  capturedCount.w = 0;
  capturedCount.b = 0;
  while (piecesGroup.children.length > 0) {
    const child = piecesGroup.children[0];
    if (!child) break;
    piecesGroup.remove(child);
  }

  const board = gameLogic.getBoard();
  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (!piece) return;

      const rank = 10 - rowIndex;
      const squareId = squareIdFrom(colIndex, rank);
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.24, 28),
        piece.color === 'b' ? BLACK_PIECE_MATERIAL : RED_PIECE_MATERIAL
      );
      mesh.position.copy(toWorldPositionBySquareId(squareId));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = squareId;
      mesh.userData.square = squareId;
      mesh.userData.color = piece.color;
      mesh.userData.type = piece.type;
      piecesGroup.add(mesh);
      pieceMeshes.set(squareId, mesh);
    });
  });
};

const updatePieceMap = (mesh: THREE.Object3D, from: string, to: string) => {
  pieceMeshes.delete(from);
  pieceMeshes.set(to, mesh);
  mesh.userData.square = to;
};

const animateCapture = (mesh: THREE.Object3D, squareId: string) => {
  const capturedColor = (mesh.userData.color as 'w' | 'b') ?? 'b';
  const index = capturedColor === 'w' ? capturedCount.w++ : capturedCount.b++;
  const graveyardPos = getGraveyardPosition(capturedColor, index);

  gsap.to(mesh.position, {
    duration: 0.8,
    x: graveyardPos.x + (Math.random() - 0.5) * 0.1,
    y: graveyardPos.y,
    z: graveyardPos.z + (Math.random() - 0.5) * 0.1,
    keyframes: {
      '0%': { y: mesh.position.y },
      '50%': { y: 2.8 },
      '100%': { y: graveyardPos.y }
    },
    ease: 'power1.inOut'
  });

  pieceMeshes.delete(squareId);
};

const animateSlide = (mesh: THREE.Object3D, from: string, to: string) => {
  const targetPos = toWorldPositionBySquareId(to);
  gsap.to(mesh.position, {
    duration: 0.5,
    x: targetPos.x,
    z: targetPos.z,
    ease: 'power2.inOut'
  });
  updatePieceMap(mesh, from, to);
};

const animateJump = (mesh: THREE.Object3D, from: string, to: string) => {
  const targetPos = toWorldPositionBySquareId(to);
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

const animateMove = (move: { from: string; to: string; piece: string; captured?: string }) => {
  const movingMesh = pieceMeshes.get(move.from);
  if (!movingMesh) return;

  if (move.captured) {
    const capturedMesh = pieceMeshes.get(move.to);
    if (capturedMesh) {
      animateCapture(capturedMesh, move.to);
    }
  }

  if (move.piece === 'ma' || move.piece === 'pao' || move.piece === 'xiang') {
    animateJump(movingMesh, move.from, move.to);
    return;
  }

  animateSlide(movingMesh, move.from, move.to);
};

const cancelSelection = () => {
  selectedSquare = null;
  legalMoves = [];
  clearHighlights();
  if (!props.isLocked) {
    controls.enabled = true;
  }
};

const handleNewSelection = (squareId: string) => {
  const piece = gameLogic.getPieceAt(squareId);
  if (!piece || piece.color !== gameLogic.getTurn()) {
    cancelSelection();
    return;
  }

  selectedSquare = squareId;
  legalMoves = gameLogic.getLegalMoves(squareId);
  showSelectionHighlights(squareId, legalMoves);

  if (!props.isLocked) {
    controls.enabled = false;
  }
};

const onMouseDown = (event: MouseEvent) => {
  const bounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const pieceIntersects = raycaster.intersectObjects([...pieceMeshes.values()], true);
  const squareIntersects = raycaster.intersectObjects(interactionGroup.children);

  const hasPieceHit = pieceIntersects.length > 0;
  const hasSquareHit = squareIntersects.length > 0;

  if (!props.isLocked && !selectedSquare && !hasPieceHit) {
    return;
  }

  if (!hasPieceHit && !hasSquareHit) {
    cancelSelection();
    return;
  }

  if (!props.isLocked) {
    controls.enabled = false;
  }

  const firstHit = pieceIntersects[0] ?? squareIntersects[0];
  if (!firstHit) return;

  const squareId = (firstHit.object.userData.square || firstHit.object.name) as string | undefined;
  if (!squareId) return;

  if (selectedSquare) {
    if (squareId === selectedSquare) {
      cancelSelection();
      return;
    }

    if (legalMoves.includes(squareId)) {
      const moved = gameLogic.makeMove(selectedSquare, squareId);
      if (moved) {
        animateMove(moved);
        cancelSelection();
        emit('turn-changed', gameLogic.getTurn());
      }
      return;
    }
  }

  handleNewSelection(squareId);
};

const resetCameraPosition = () => {
  const targetPos = props.playerColor === 'white' ? WHITE_POS : BLACK_POS;
  const startPos = camera.position.clone();
  const isCrossing = Math.sign(startPos.z) !== Math.sign(targetPos.z);

  if (isCrossing && Math.abs(startPos.z) > 1) {
    const proxy = { t: 0 };
    gsap.to(proxy, {
      duration: 1.5,
      t: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = proxy.t;
        const xOffset = Math.sin(t * Math.PI) * 10;
        camera.position.x = THREE.MathUtils.lerp(startPos.x, targetPos.x, t) + xOffset;
        camera.position.z = THREE.MathUtils.lerp(startPos.z, targetPos.z, t);
        camera.position.y = THREE.MathUtils.lerp(startPos.y, targetPos.y, t);
        camera.lookAt(LOOKAT);
      }
    });
  } else {
    gsap.to(camera.position, {
      duration: 1.0,
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(LOOKAT)
    });
  }
};

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

const initScene = () => {
  if (!container.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.copy(props.playerColor === 'white' ? WHITE_POS : BLACK_POS);
  camera.lookAt(LOOKAT);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enabled = !props.isLocked;
  controls.target.copy(LOOKAT);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
  keyLight.position.set(6, 12, 8);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xfff3e6, 0.5);
  fillLight.position.set(-8, 6, -6);
  scene.add(fillLight);

  createBoard();
  createInteractionLayer();
  createHighlightLayer();
  piecesGroup = new THREE.Group();
  scene.add(piecesGroup);
  rebuildPieces();

  renderer.domElement.addEventListener('mousedown', onMouseDown);

  animate();
  emit('turn-changed', gameLogic.getTurn());
};

watch(() => props.isLocked, (locked) => {
  if (!controls) return;
  if (locked) {
    controls.enabled = false;
    resetCameraPosition();
  } else {
    controls.enabled = true;
  }
});

watch(() => props.playerColor, () => {
  if (props.isLocked && camera) {
    resetCameraPosition();
  }
});

onMounted(() => {
  initScene();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (renderer) {
    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    renderer.dispose();
  }
});
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: 100%;
}
</style>
