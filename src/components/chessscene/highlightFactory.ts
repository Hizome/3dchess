import * as THREE from 'three';
import { getSquarePosition } from './boardUtils';

export const createRingIndicator = (
  squareId: string,
  color: number,
  innerRadius: number,
  outerRadius: number,
  opacity: number
) => {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 36);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(getSquarePosition(squareId));
  return mesh;
};

export const createDotIndicator = (squareId: string, color: number, radius: number, opacity: number) => {
  const geometry = new THREE.CircleGeometry(radius, 28);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(getSquarePosition(squareId));
  return mesh;
};
