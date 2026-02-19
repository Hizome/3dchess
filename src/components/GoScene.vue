<template>
  <div ref="container" class="scene-container">
    <GoInfoPanel
      :can-undo="canUndo"
      :black-area="blackArea"
      :white-area="whiteArea"
      :black-captures="blackCaptures"
      :white-captures="whiteCaptures"
      @undo="handleUndo"
      @restart="handleRestart"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { GoGameLogic } from '../logic/GoGameLogic';
import { AssetManager } from '../utils/AssetManager';
import goBoardModelUrl from '../assets/go_board.glb?url';
import GoInfoPanel from './goscene/GoInfoPanel.vue';

const props = defineProps<{
  playerColor: string;
  isLocked: boolean;
  autoRotate: boolean;
}>();

const emit = defineEmits<{
  (e: 'turn-changed', color: string): void;
}>();

const BOARD_SIZE = 19;
const HALF_GRID = (BOARD_SIZE - 1) / 2;
const GRID_SPACING = 0.5;
const GO_BOARD_SCALE = 10.5;
const GO_BOARD_OFFSET_X = 0;
const GO_BOARD_OFFSET_Y = -2.3;
const GO_BOARD_OFFSET_Z = 0;
const GO_STONE_Y = 0.08;
const GO_SCENE_SCALE = 1.5;

const container = ref<HTMLElement | null>(null);
const gameLogic = new GoGameLogic(BOARD_SIZE);
const assetManager = new AssetManager();
const canUndo = ref(false);
const blackArea = ref(0);
const whiteArea = ref(0);
const blackCaptures = ref(0);
const whiteCaptures = ref(0);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let playfieldGroup: THREE.Group;
let boardGroup: THREE.Group;
let boardModel: THREE.Group | null = null;
let interactionGroup: THREE.Group;
let stonesGroup: THREE.Group;
let hoverIndicator: THREE.Mesh | null = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const stoneMeshes = new Map<string, THREE.Mesh>();

const WHITE_POS = new THREE.Vector3(0, 11, 13);
const BLACK_POS = new THREE.Vector3(0, 11, -13);
const LOOKAT = new THREE.Vector3(0, 0, 0);

const blackStoneMaterial = new THREE.MeshStandardMaterial({
  color: 0x1f1f1f,
  metalness: 0.22,
  roughness: 0.4
});

const whiteStoneMaterial = new THREE.MeshStandardMaterial({
  color: 0xf0f0f0,
  metalness: 0.12,
  roughness: 0.35
});

const pointIdFrom = (x: number, y: number) => `${x},${y}`;

const parsePointId = (pointId: string) => {
  const [xRaw, yRaw] = pointId.split(',');
  const x = Number(xRaw);
  const y = Number(yRaw);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
};

const toWorldPositionByPointId = (pointId: string, y = GO_STONE_Y) => {
  const { x, y: gridY } = parsePointId(pointId);
  return new THREE.Vector3((x - HALF_GRID) * GRID_SPACING, y, (gridY - HALF_GRID) * GRID_SPACING);
};

const createBoard = () => {
  boardGroup = new THREE.Group();

  const boardWidth = (BOARD_SIZE - 1) * GRID_SPACING + 1;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(boardWidth + 0.8, 0.7, boardWidth + 0.8),
    new THREE.MeshStandardMaterial({ color: 0x6f4b2f, roughness: 0.78 })
  );
  base.position.y = -0.38;
  base.receiveShadow = true;
  boardGroup.add(base);

  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(boardWidth, boardWidth),
    new THREE.MeshStandardMaterial({ color: 0xc89a62, roughness: 0.88 })
  );
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  boardGroup.add(top);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x2d1b0f });
  const min = -HALF_GRID * GRID_SPACING;
  const max = HALF_GRID * GRID_SPACING;

  for (let i = 0; i < BOARD_SIZE; i += 1) {
    const v = (i - HALF_GRID) * GRID_SPACING;
    const vertical = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(v, 0.01, min),
      new THREE.Vector3(v, 0.01, max)
    ]);
    boardGroup.add(new THREE.Line(vertical, lineMaterial));

    const horizontal = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(min, 0.01, v),
      new THREE.Vector3(max, 0.01, v)
    ]);
    boardGroup.add(new THREE.Line(horizontal, lineMaterial));
  }

  playfieldGroup.add(boardGroup);
};

const loadBoardModel = async () => {
  try {
    boardModel = await assetManager.loadModel(goBoardModelUrl);
    boardModel.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
      }
    });
    boardModel.position.set(GO_BOARD_OFFSET_X, GO_BOARD_OFFSET_Y, GO_BOARD_OFFSET_Z);
    boardModel.scale.setScalar(GO_BOARD_SCALE);
    playfieldGroup.add(boardModel);
  } catch (err) {
    boardModel = null;
    console.warn('Failed to load go board model, fallback to procedural board.', err);
    createBoard();
  }
};

const createInteractionLayer = () => {
  interactionGroup = new THREE.Group();
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const pointId = pointIdFrom(x, y);
      const marker = new THREE.Mesh(
        new THREE.CircleGeometry(0.18, 18),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.01, depthWrite: false })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.copy(toWorldPositionByPointId(pointId, 0.03));
      marker.userData.pointId = pointId;
      interactionGroup.add(marker);
    }
  }
  playfieldGroup.add(interactionGroup);
};

const createHoverIndicator = () => {
  hoverIndicator = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.19, 24),
    new THREE.MeshBasicMaterial({
      color: 0x1dc7ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  hoverIndicator.rotation.x = -Math.PI / 2;
  hoverIndicator.visible = false;
  playfieldGroup.add(hoverIndicator);
};

const createStoneMeshAt = (pointId: string, color: 'b' | 'w', animated = true) => {
  const geometry = new THREE.SphereGeometry(0.2, 30, 20);
  geometry.scale(1, 0.42, 1);
  const mesh = new THREE.Mesh(geometry, color === 'b' ? blackStoneMaterial : whiteStoneMaterial);
  const targetPos = toWorldPositionByPointId(pointId, GO_STONE_Y);
  mesh.position.set(targetPos.x, animated ? 0.8 : targetPos.y, targetPos.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.pointId = pointId;
  stonesGroup.add(mesh);
  stoneMeshes.set(pointId, mesh);

  if (animated) {
    gsap.to(mesh.position, {
      duration: 0.26,
      y: targetPos.y,
      ease: 'power2.out'
    });
  }
};

const clearStoneMeshes = () => {
  stoneMeshes.forEach((mesh) => {
    stonesGroup.remove(mesh);
  });
  stoneMeshes.clear();
};

const rebuildStonesFromLogic = () => {
  clearStoneMeshes();
  gameLogic.getAllStones().forEach((color, pointId) => {
    createStoneMeshAt(pointId, color, false);
  });
};

const syncGoInfo = () => {
  canUndo.value = gameLogic.canUndo();
  const area = gameLogic.getAreaCounts();
  const captures = gameLogic.getCaptureCounts();
  blackArea.value = area.b;
  whiteArea.value = area.w;
  blackCaptures.value = captures.b;
  whiteCaptures.value = captures.w;
};

const placeStoneAt = (pointId: string) => {
  const move = gameLogic.makeMove(pointId);
  if (!move) return;

  move.captured.forEach((capturedPointId) => {
    const capturedMesh = stoneMeshes.get(capturedPointId);
    if (!capturedMesh) return;
    stonesGroup.remove(capturedMesh);
    stoneMeshes.delete(capturedPointId);
  });

  createStoneMeshAt(pointId, move.color, true);
  syncGoInfo();
  emit('turn-changed', gameLogic.getTurn());
};

const handleUndo = () => {
  const undone = gameLogic.undoMove();
  if (!undone) return;
  rebuildStonesFromLogic();
  syncGoInfo();
  emit('turn-changed', gameLogic.getTurn());
};

const handleRestart = () => {
  gameLogic.resetGame();
  rebuildStonesFromLogic();
  syncGoInfo();
  emit('turn-changed', gameLogic.getTurn());
};

const onMouseDown = (event: MouseEvent) => {
  const bounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(interactionGroup.children);
  const firstHit = intersects[0];
  if (!firstHit) return;

  const pointId = firstHit.object.userData.pointId as string | undefined;
  if (!pointId) return;
  placeStoneAt(pointId);
};

const onMouseMove = (event: MouseEvent) => {
  if (!hoverIndicator) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(interactionGroup.children);
  const firstHit = intersects[0];
  if (!firstHit) {
    hoverIndicator.visible = false;
    return;
  }

  const pointId = firstHit.object.userData.pointId as string | undefined;
  if (!pointId || gameLogic.getStoneAt(pointId)) {
    hoverIndicator.visible = false;
    return;
  }

  hoverIndicator.position.copy(toWorldPositionByPointId(pointId, 0.05));
  hoverIndicator.visible = true;
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

const initScene = async () => {
  if (!container.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  playfieldGroup = new THREE.Group();
  playfieldGroup.scale.setScalar(GO_SCENE_SCALE);
  scene.add(playfieldGroup);

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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.82);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
  keyLight.position.set(8, 14, 10);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xfff3e6, 0.48);
  fillLight.position.set(-8, 8, -8);
  scene.add(fillLight);

  await loadBoardModel();
  createInteractionLayer();
  createHoverIndicator();

  stonesGroup = new THREE.Group();
  playfieldGroup.add(stonesGroup);
  gameLogic.resetGame();
  rebuildStonesFromLogic();
  syncGoInfo();

  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  emit('turn-changed', gameLogic.getTurn());
  animate();
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
    renderer.domElement.removeEventListener('mousemove', onMouseMove);
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
