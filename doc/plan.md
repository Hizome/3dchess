# Project Plan - 3D International Chess

A web-based 3D International Chess game built with Vue 3 and Three.js.

## Objectives
- **Game Modes**:
    - **Human vs AI**: Choose side (White/Black).
    - **Human vs Human**: Local multiplayer, no initial side selection (starts White).
- Realistic 3D visualization using Blender assets with a **Hybrid Camera System**:
    - **Locked Mode**: Fixed cinematic angle (White or Black perspective). Interaction enabled.
    - **Observation Mode**: Full 3D rotation and zooming. Interaction disabled.
    - **Auto-Rotate**: Optional setting to automatically switch perspective to the active player after each turn.
- Immersive environment where the board occupies 2/3 of the screen, fixed on a study desk.
- Interactive gameplay optimized for performance: the piece mesh stays stationary during mouse dragging; movement is triggered only upon release/click.
- **Unified Settings System**:
    - **Shared Modal**: Accessible from Main Menu and In-Game HUD.
    - **Options**: 
        - **Return to Main Menu**: Exits the current game session.
        - **Auto-Rotate Camera**: Toggle to switch perspective automatically on turn change.
- **HUD Layout**:
    - **Bottom-Right**: Floating Settings button and **Enhanced Camera Lock Toggle**.
        - *Locking*: Chosing to lock allows selecting "White View" or "Black View".
        - *Unlocking*: Single click to return to free observation.
    - **Top-Left**: Semi-transparent panel for AI (Robot Player).
    - **Top-Right**: Semi-transparent panel for Human Player.
- **Theming System**:
    - **Change Theme Functionality**: Dynamically switch the entire game aesthetic.
    - **Scope**:
        - **UI Theme**: Colors, fonts, HUD styles.
        - **3D Assets**: Different chess piece models (e.g., Classic, Sci-Fi).
        - **Board Material**: Texture and color changes.
        - **Environment**: Skybox, background room, and lighting changes.
- Menu system with color selection (Play as White/Black) and basic settings.

## Tech Stack
- **Framework**: Vue 3 (Composition API)
- **3D Engine**: Three.js
- **Logic Engine**: **chess.js** (Standard chess rules and state management)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Modern features like Glassmorphism)

## Development Phases
0. **Prototyping (Testing)**: 
    - Use primitives (Box/Cylinder) as placeholders for pieces.
    - Implement a basic checkered plane for the board.
    - Functional logic verification (movements/turns) without waiting for models.
1. **Foundation**: Project setup, Three.js basic scene.
2. **Asset Pipeline**: 
    - Modeling pieces and board in **Blender**.
    - Exporting to **GLB** (using PBR materials).
    - Implementing a `GLTFLoader` service in Vue.
3. **Environment**:
    - Adding **HDRI** environment maps.
    - Creating a background scene (skybox or modeling a background room).
4. **Logic**: Rule engine implementation (moves, checkmate, special moves).
5. **Interaction**: Mouse/Touch picking (Raycasting), UI overlays.
6. **Polish**: Lights, shadows, animations, HUD refinements.
7. **Future Expansion (Backend & Content)**: 
    - **Perspective Switching**: Allow changing views or camera movement in-game.
    - **Multi-Theme**: Support for different board skins and room styles.
    - **Audio Settings**: Adjustable background music.
    - **Multiplayer**: Real-time server using **Rust/Go**.
