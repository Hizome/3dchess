import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetManager {
    private loader: GLTFLoader;
    private cache: Map<string, THREE.Group>;

    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
    }

    public async loadModel(path: string): Promise<THREE.Group> {
        if (this.cache.has(path)) {
            return this.cache.get(path)!.clone();
        }

        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (gltf: GLTF) => {
                    this.cache.set(path, gltf.scene);
                    resolve(gltf.scene.clone());
                },
                undefined,
                (error: unknown) => reject(error)
            );
        });
    }
}
