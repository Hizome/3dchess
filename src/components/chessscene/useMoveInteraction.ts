import * as THREE from 'three';
import gsap from 'gsap';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GameLogic } from '../../logic/GameLogic';
import { createDotIndicator, createRingIndicator } from './highlightFactory';
import type { ChessMove } from './usePieceAnimation';

type UseMoveInteractionOptions = {
  gameLogic: GameLogic;
  pieceMeshes: Map<string, THREE.Object3D>;
  mouse: THREE.Vector2;
  raycaster: THREE.Raycaster;
  getRenderer: () => THREE.WebGLRenderer;
  getCamera: () => THREE.PerspectiveCamera;
  getControls: () => OrbitControls;
  getSquaresGroup: () => THREE.Group;
  getHighlightGroup: () => THREE.Group;
  isLocked: () => boolean;
  resolveSquareIdFromObject: (object: THREE.Object3D) => string | null;
  onMoveApplied: (move: ChessMove) => void;
};

export const useMoveInteraction = ({
  gameLogic,
  pieceMeshes,
  mouse,
  raycaster,
  getRenderer,
  getCamera,
  getControls,
  getSquaresGroup,
  getHighlightGroup,
  isLocked,
  resolveSquareIdFromObject,
  onMoveApplied
}: UseMoveInteractionOptions) => {
  let selectedSquare: string | null = null;
  let legalMoves: string[] = [];
  let selectedIndicator: THREE.Mesh | null = null;
  const legalIndicators: Map<string, THREE.Mesh> = new Map();
  let hoveredLegalSquare: string | null = null;

  const resetHovers = () => {
    if (!hoveredLegalSquare) return;
    const hovered = legalIndicators.get(hoveredLegalSquare);
    if (hovered) {
      const material = hovered.material as THREE.MeshBasicMaterial;
      material.color.setHex(0x1dc7ff);
      material.opacity = 0.5;
      hovered.scale.set(1, 1, 1);
    }
    hoveredLegalSquare = null;
  };

  const resetSquareHighlights = () => {
    hoveredLegalSquare = null;
    const highlightGroup = getHighlightGroup();

    if (selectedIndicator) {
      gsap.killTweensOf(selectedIndicator.scale);
      highlightGroup.remove(selectedIndicator);
      selectedIndicator.geometry.dispose();
      (selectedIndicator.material as THREE.Material).dispose();
      selectedIndicator = null;
    }

    legalIndicators.forEach((indicator) => {
      gsap.killTweensOf(indicator.scale);
      highlightGroup.remove(indicator);
      indicator.geometry.dispose();
      (indicator.material as THREE.Material).dispose();
    });
    legalIndicators.clear();
  };

  const showHoverBorder = (squareId: string) => {
    if (hoveredLegalSquare === squareId) return;

    if (hoveredLegalSquare) {
      const prev = legalIndicators.get(hoveredLegalSquare);
      if (prev) {
        const material = prev.material as THREE.MeshBasicMaterial;
        material.color.setHex(0x1dc7ff);
        material.opacity = 0.5;
        prev.scale.set(1, 1, 1);
      }
    }

    const current = legalIndicators.get(squareId);
    if (!current) return;
    const currentMaterial = current.material as THREE.MeshBasicMaterial;
    currentMaterial.color.setHex(0xffffff);
    currentMaterial.opacity = 0.95;
    current.scale.set(1.22, 1.22, 1.22);
    hoveredLegalSquare = squareId;
  };

  const showSelectionHighlights = (squareId: string, moves: string[]) => {
    resetSquareHighlights();
    const highlightGroup = getHighlightGroup();

    selectedIndicator = createRingIndicator(squareId, 0x2dff8e, 0.26, 0.4, 0.95);
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
      const dot = createDotIndicator(moveSquare, 0x1dc7ff, 0.15, 0.5);
      highlightGroup.add(dot);
      legalIndicators.set(moveSquare, dot);
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

  const cancelSelection = () => {
    selectedSquare = null;
    legalMoves = [];
    resetSquareHighlights();
    if (!isLocked()) {
      getControls().enabled = true;
    }
  };

  const handleNewSelection = (squareId: string) => {
    const board = gameLogic.getBoard();
    const col = squareId.charCodeAt(0) - 97;
    const row = 8 - parseInt(squareId.slice(1), 10);
    const boardRow = board[row];
    if (!boardRow) {
      cancelSelection();
      return;
    }

    const piece = boardRow[col];
    if (piece && piece.color === gameLogic.getTurn()) {
      selectedSquare = squareId;
      if (!isLocked()) {
        getControls().enabled = false;
      }
      legalMoves = gameLogic.getLegalMoves(squareId);
      showSelectionHighlights(squareId, legalMoves);
    } else {
      cancelSelection();
    }
  };

  const onMouseDown = (event: MouseEvent) => {
    const renderer = getRenderer();
    const camera = getCamera();
    const squaresGroup = getSquaresGroup();

    const bounds = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const pieceIntersects = raycaster.intersectObjects([...pieceMeshes.values()], true);
    const squareIntersects = raycaster.intersectObjects(squaresGroup.children);

    const hasPieceHit = pieceIntersects.length > 0;
    const hasSquareHit = squareIntersects.length > 0;

    if (!isLocked() && !selectedSquare && !hasPieceHit) {
      return;
    }

    if (!hasPieceHit && !hasSquareHit) {
      cancelSelection();
      return;
    }

    if (!isLocked()) {
      getControls().enabled = false;
    }

    const firstHit = pieceIntersects[0] ?? squareIntersects[0];
    if (!firstHit) return;

    const squareId = resolveSquareIdFromObject(firstHit.object);
    if (!squareId) return;

    if (selectedSquare) {
      if (squareId === selectedSquare) {
        cancelSelection();
      } else {
        const move = gameLogic.makeMove(selectedSquare, squareId) as ChessMove | null;
        if (move) {
          onMoveApplied(move);
          cancelSelection();
        } else {
          handleNewSelection(squareId);
        }
      }
    } else {
      handleNewSelection(squareId);
    }
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!selectedSquare) return;

    const renderer = getRenderer();
    const camera = getCamera();
    const squaresGroup = getSquaresGroup();
    const bounds = renderer.domElement.getBoundingClientRect();

    mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(squaresGroup.children);

    resetHovers();

    if (intersects.length > 0) {
      const firstHit = intersects[0];
      if (!firstHit) return;
      const squareId = firstHit.object.name;
      if (squareId && legalMoves.includes(squareId)) {
        showHoverBorder(squareId);
      }
    }
  };

  return {
    onMouseDown,
    onMouseMove,
    cancelSelection,
    resetSquareHighlights
  };
};
