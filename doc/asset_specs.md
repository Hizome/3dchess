# 3D Asset Specification & Workflow Guide

## Directory Structure
Place all exported models and textures in the public directory:
```
public/
  models/
    board.glb
    pieces/
      wb.glb  (White Bishop)
      wk.glb  (White King)
      wn.glb  (White Knight)
      wp.glb  (White Pawn)
      wq.glb  (White Queen)
      wr.glb  (White Rook)
      bb.glb  (Black Bishop)
      ...     (etc.)
  textures/
    env/
      studio_small_03_1k.hdr (or similar HDRI)
```

## Naming Convention
Please follow this strict naming convention for seamless code integration.

| Piece Type | White File Name | Black File Name |
| :--- | :--- | :--- |
| **King** | `wk.glb` | `bk.glb` |
| **Queen** | `wq.glb` | `bq.glb` |
| **Rook** | `wr.glb` | `br.glb` |
| **Bishop** | `wb.glb` | `bb.glb` |
| **Knight** | `wn.glb` | `bn.glb` |
| **Pawn** | `wp.glb` | `bp.glb` |
| **Board** | `board.glb` | N/A |

> **Note**: This naming matches the standard chess algebraic notation prefixes used in our code (`w`=White, `b`=Black + Piece Initial).

---

## Blender Export Settings (GLTF/GLB)

When exporting from Blender, ensure the following settings are applied to avoid scaling or rotation issues in Three.js.

### 1. Geometry & Transform
*   **Format**: `.glb` (Binary) - preferred for single-file convenience.
*   **Transform**:
    *   **+Y Up**: Ensure the model is oriented with +Y as the "Up" axis. (Blender uses +Z Up, so the exporter usually handles this conversion, but verify).
    *   **Forward Axis**: +Z or -Z.
    *   **Apply Transforms**: Select your object and press `Ctrl + A` -> `All Transforms` **before** exporting. This resets Scale to (1,1,1) and Rotation to (0,0,0).
*   **Origin Point**:
    *   **Pieces**: The origin (0,0,0) should be at the **bottom center** of the piece base. This ensures they sit perfectly on the board squares (y=0 or y=height).
    *   **Board**: The origin should be at the **exact center** of the board surface.

### 2. Materials (PBR)
*   **Shader**: Use the standard `Principled BSDF` node.
*   **Textures**:
    *   Base Color
    *   Metallic
    *   Roughness
    *   Normal Map (Optional)
*   **Embedding**: In the export dialog, under **Data > Mesh**, check **UVs**, **Normals**, and **Vertex Colors** (if used). Under **Settings**, enable **Remember Export Settings**.

### 3. Scale Reference
To match the code's current layout logic:
*   **1 Unit = 1 Square Width**.
*   **Piece Base Diameter**: Approx **0.6 - 0.7 units**.
*   **Piece Height**:
    *   Pawn: ~0.8 units
    *   King: ~2.0 units
*   **Board**: The playable 8x8 area should span from -4 to +4 on X and Z axes.

---

## Loading Strategy
The `AssetManager` will be updated to:
1.  Preload `board.glb`.
2.  Preload a single instance of each unique piece (`wk`, `wp`, `bk`, etc.).
3.  **Instancing/Cloning**: During game init, we will `.clone()` the loaded master meshes to place them on the board. This is efficient and allows independent animation.
