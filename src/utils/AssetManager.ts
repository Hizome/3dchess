import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class AssetManager {
    private loader: GLTFLoader;
    private dracoLoader: DRACOLoader;
    private static cache: Map<string, THREE.Group> = new Map();
    private static pendingLoads: Map<string, Promise<THREE.Group>> = new Map();

    constructor() {
        this.loader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/draco/');
        this.loader.setDRACOLoader(this.dracoLoader);
    }

    public async loadModel(
        path: string,
        onProgress?: (loaded: number, total: number) => void
    ): Promise<THREE.Group> {
        if (AssetManager.cache.has(path)) {
            onProgress?.(1, 1);
            return AssetManager.cache.get(path)!.clone();
        }

        if (AssetManager.pendingLoads.has(path)) {
            onProgress?.(0, 1);
            const cached = await AssetManager.pendingLoads.get(path)!;
            onProgress?.(1, 1);
            return cached.clone();
        }

        const loadPromise = new Promise<THREE.Group>((resolve, reject) => {
            this.loader.load(
                path,
                (gltf: GLTF) => {
                    AssetManager.cache.set(path, gltf.scene);
                    AssetManager.pendingLoads.delete(path);
                    onProgress?.(1, 1);
                    resolve(gltf.scene);
                },
                (event: ProgressEvent<EventTarget>) => {
                    if (event.total > 0) {
                        onProgress?.(event.loaded, event.total);
                    }
                },
                (error: unknown) => {
                    AssetManager.pendingLoads.delete(path);
                    reject(error);
                }
            );
        });

        AssetManager.pendingLoads.set(path, loadPromise);
        const loaded = await loadPromise;
        return loaded.clone();
    }

    public async preloadModels(
        paths: string[],
        onProgress?: (progress: number) => void
    ): Promise<void> {
        if (paths.length === 0) {
            onProgress?.(1);
            return;
        }

        const uniquePaths = [...new Set(paths)];
        const pathProgress = new Map<string, number>();
        uniquePaths.forEach((path) => pathProgress.set(path, 0));

        const reportProgress = () => {
            const totalProgress = [...pathProgress.values()].reduce((sum, value) => sum + value, 0);
            onProgress?.(totalProgress / uniquePaths.length);
        };

        reportProgress();

        await Promise.all(
            uniquePaths.map((path) =>
                this.loadModel(path, (loaded, total) => {
                    const value = total > 0 ? Math.min(loaded / total, 1) : 0;
                    pathProgress.set(path, value);
                    reportProgress();
                }).then(() => {
                    pathProgress.set(path, 1);
                    reportProgress();
                })
            )
        );
    }
}
