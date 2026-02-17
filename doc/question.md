# Common Questions & Design Decisions

## Visuals

### Why do legal move highlights appear in different shades of blue?

**Observation:**
When a piece is selected, the squares representing legal moves are highlighted in blue. However, some squares appear as a lighter blue, while others appear as a darker blue.

**Explanation:**
This is a natural result of how **Three.js PBR (Physically Based Rendering) materials** work.

1.  **Material Mechanics**: We use `MeshStandardMaterial` for the board squares. When valid moves are highlighted, we do not replace the square's base color; instead, we add an **`emissive` (glowing)** property to it.
2.  **Color Blending**: The final color perceived is a blend of the square's base color (diffuse) and the emitted light (emissive).
    *   **Light Squares**: Base color is Light Gray (`0xdddddd`). Mixing this with the Blue emissive light results in a **Pale/Light Blue**.
    *   **Dark Squares**: Base color is Dark Gray (`0x222222`). Mixing this with the Blue emissive light results in a **Deep/Dark Blue**.

**Decision:**
We decided to keep this effect as it adds a layer of realism and depth to the 3D scene, reflecting how light would actually interact with different colored surfaces, rather than forcing a flat, artificial overlay color.
