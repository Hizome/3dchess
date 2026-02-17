# Architecture - 3D International Chess

## System Overview
The application follows a modular architecture separating the 3D rendering layer, the game logic, and the UI state.

## Components

### 1. Rendering Layer (Three.js)
### 1. Rendering Layer (Three.js & Assets)
- **Asset Categories**:
  - **3D Models (`/public/models/`)**: 
    - `board.glb`: The main chessboard and table.
    - `pieces.glb` or individual files: Optimized geometries with PBR materials.
    - *Processing*: Models are loaded via `GLTFLoader` with Draco compression for performance.
  - **Background (`/public/textures/`)**:
    - `env_map.hdr`: HDRI for image-based lighting (IBL) and realistic reflections.
    - `skybox/`: 6-side cube map or a 360 sphere texture for the surrounding environment.
    - `bg_scene.glb`: (Optional) A background room mesh to create a "study room" atmosphere.
  - **Audio (`/public/audio/`)**:
    - `bgm.mp3`: Ambient background music (looped).
    - `move.wav`, `capture.wav`, `check.wav`: Short, high-quality spatial sound effects.
- **Service Layer**:
  - **`AssetManager.ts`**: Centralized loader for all resource types. Ensures the game only starts after critical assets are ready.
  - **`AudioController.ts`**: Manages play/pause, volume levels, and triggers sound effects based on game events.
- **Scene Manager (`ChessScene.vue`)**: 
    - *Camera Types*:
        - **Locked Perspective (Gameplay Mode)**: Fixed `PerspectiveCamera` state. Can be locked to **White POV** or **Black POV**. Both allow gameplay interaction.
        - **Free Observation (Viewer Mode)**: Enables `OrbitControls`. Interaction disabled.
    - *Auto-Rotate*: If enabled in settings, camera smoothly transitions to the current player's POV after every turn.
    - *Camera Locking UI*: 
        - When Unlocked -> Click Lock -> Show options: [Lock White] | [Lock Black].
        - When Locked -> Click Unlock -> Immediately free camera.
    - *Performance Optimization*: 
        - **Static Lighting/Baking**: Optimizations are still valid as the environment is static; only the observer's view changes.
    - *Spatial Consistency*: The 3D world is a unified "Study Room." If a book is at $(X, Z)$, it stays there. Switching to Black perspective simply flips the camera to the opposite $( -X, -Z)$ position, naturally causing the book to appear in the "opposite" corner of the screen.
- **Interaction Manager**: 
    - *Mechanic (Performance Optimized)*: 
        - **Drag-to-Move**: Click-Hold piece (selects it) -> Move mouse to target -> Release. **The 3D mesh does NOT follow the mouse cursor** during the hold to save draw calls.
        - **Click-to-Move**: Click piece (selects it) -> Click target.
    - *Feedback UI*:
        - **Selection**: Highlights the selected piece and shows legal target squares.
        - **Hover Effect**: When the mouse is over a **legal square** (during a drag or after a click), a **hover border** appears on that square.
        - **Cancellation**: Releasing or clicking on an **illegal square** refreshes the state and clears highlights.
    - **Animation System (GSAP)**:
        - **Movement Types**:
            - **Sliding Move**: All pieces (except Knights) move linearly across the board with a slight vertical offset (Y-axis) to avoid clipping.
            - **Jumping Move**: 
                - **Knights**: Always use an arched height-based jump to their destination.
                - **Castling (Rook)**: The King slides, but the Rook **jumps** over the King to its target square.
        - **Capture & Graveyard Sequence**:
        - **Movement**: Pieces fly into the Graveyard via a smooth parabolic trajectory.
        - **Graveyard Arrangement (Fixed Staggered)**: 
            - Pieces are NOT arranged in a perfect grid nor a random mess.
            - Instead, they follow a **pre-defined staggered/crowded layout** (slightly offset positions) to simulate a natural used-look while maintaining consistent performance.
    - **Graveyard Locations (Perspective Dependent)**:
        - **If Player is White**:
            - **Black Graveyard**: Located on the **Right** side of the board, near the bottom half.
            - **White Graveyard**: Located on the **Left** side of the board, near the top half.
        - **If Player is Black**:
            - **White Graveyard**: Located on the **Right** side of the board, near the bottom half.
            - **Black Graveyard**: Located on the **Left** side of the board, near the top half.
        - *Consistency*: Captured pieces always fly to these fixed locations on the "desk" relative to the camera.
- **Scene Setup**: `ChessScene.vue` integrates the background geometry and atmosphere.

### 2. Logic Layer (chess.js Bridge)
- **Game Engine (`useChessGame.ts`)**: 
  - Maintains an internal `Chess` instance from `chess.js`.
  - Exposes reactive state: `board`, `turn`, `isGameOver`, `lastMove`.
  - Provides `makeMove(from, to)` method which validates via `chess.js` before updating the 3D world.
- **Coordinate Mapper**: Utility to convert between Chess Algebraic Notation (e.g., "e4") and 3D Vector coordinates (x, z).

### 3. UI Layer (Vue 3)
- **App.vue**: Controls the transition from Menu to Game state.
- **MainMenu.vue**: 
    - **New Game**: Includes color selection (White / Black).
- **HUD.vue**: 
    - **PlayerPanels**: 
        - `Top-Left`: AI Info (Semi-transparent Glassmorphism).
        - `Top-Right`: Human Info (Semi-transparent Glassmorphism).
    - **Action Controls**:
        - `Bottom-Right`: Settings Modal trigger (Resign, Pause, Exit).

### 4. Future Backend (Rust/Go) - [Deferred]
- **API Server**: REST/gRPC for user management and metadata.
- **Game Server**: State synchronization via WebSockets to enable cross-device play.
- **Persistence Layer**: SQL or NoSQL database to store PGN logs and ELO ratings.

## Data Flow & Events
1. **Init**: `AssetManager` preloads resources. Camera defaults to **Locked Perspective**.
2. **Camera Toggle**: User clicks "Unlock/Observation" in HUD -> Camera enables `OrbitControls`; Game logic interaction is blocked.
3. **User Interaction (Locked Mode)**:
    - User clicks or presses on a Piece mesh.
    - `useChessGame` identifies legal moves.
3. **Hover & Intent**:
    - As the user moves the mouse (holding or after a click), `InteractionManager` highlights the **hover border** of legal squares under the cursor.
4. **Action Execution**:
    - **Valid Target (Release or Click)**:
        - `useChessGame.makeMove()` updates logic.
        - `GSAP` triggers the transition animation from A to B.
    - **Invalid Target (Release or Click anywhere else)**:
        - State is refreshed; highlights are cleared; piece remains stationary.
5. **State Sync**: Vue watchers update HUD.
## Asset Replacement Strategy (Test to Production)
### 1. Placeholder Stage (Verification)
- **Board**: `THREE.GridHelper` or a `Mesh` with `PlaneGeometry(8, 8)`.
- **Pieces**: `THREE.CylinderGeometry`. 
    - *Mapping*: King (Tall), Queen (Medium-Tall), Pawn (Short), etc.
    - *Colors*: White (0xffffff) / Black (0x333333).
- **Goal**: Verify `chess.js` integration and `Raycaster` accuracy.

### 2. Production Stage (Final Assets)
- **Swap**: Replace primitive mesh generation with `GLTFLoader` callbacks.
- **Unified Interface**: Both placeholders and GLB models will be wrapped in the same `Piece` class structure, ensuring the `GameLogic` remains agnostic to the visual representation.
- **Asset Hot-swapping**: Enable a "Debug Mode" to toggle between placeholders and real models for performance testing.
