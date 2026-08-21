"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Turntable, type TurntableProps } from "./turntable";

/**
 * The deck on a plain white stage.
 *
 * Lit with plain lights and grounded with a contact shadow rather than an hdr
 * environment: drei's presets fetch their map from a cdn, which would make the
 * page depend on a third party to render at all.
 */
export function TurntableScene(props: TurntableProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4.8, 4.8, 8.0], fov: 34 }}
      // Transparent so the page's own white shows through and the canvas can
      // sit under the layout without a seam.
      gl={{ alpha: true, antialias: true }}
      style={{ touchAction: "none" }}
    >
      {/* Kept low on purpose. Flat fill washes the grooves out; the disc only
          reads as vinyl when a hard key sweeps across the rings. */}
      <ambientLight intensity={0.42} />
      <hemisphereLight args={["#ffffff", "#dcdcdc", 0.45]} />
      <directionalLight
        position={[4, 7, 4]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {/* Fill from the opposite side so the far edge never goes to black. */}
      <directionalLight position={[-5, 3, -4]} intensity={0.5} />
      {/* Grazing light purely for the grooves. */}
      <directionalLight position={[-2, 1.4, 6]} intensity={0.75} />

      <Turntable {...props} />

      <ContactShadows
        position={[0, 0.01, 0]}
        scale={12}
        blur={2.4}
        opacity={0.42}
        far={4}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={4}
        maxDistance={14}
        // Stops the camera dropping under the plinth, where there is nothing
        // modelled and the deck would read as a floating slab.
        maxPolarAngle={Math.PI / 2 - 0.06}
        minPolarAngle={0.18}
        enableDamping
        dampingFactor={0.08}
        // Aimed at the platter rather than the origin, so the deck sits
        // centred once the library takes the right third of the viewport.
        target={[0, 0.5, 0]}
      />
    </Canvas>
  );
}
