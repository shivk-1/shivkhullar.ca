"use client";

import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
} from "@react-three/drei";
import { Turntable, type TurntableProps } from "./turntable";

/**
 * The deck on a plain white stage.
 *
 * The environment is built in-scene from lightformers rather than loaded as an
 * hdr: drei's presets fetch their map from a cdn, which would make the page
 * depend on a third party to render at all. Chrome and brushed aluminium need
 * something to reflect — with directional lights alone, metal renders black —
 * so a softbox rig stands in for a studio.
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
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[4, 7, 4]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
      />
      {/* Fill from the opposite side so the far edge never goes to black. */}
      <directionalLight position={[-5, 3, -4]} intensity={0.35} />
      {/* Grazing light purely for the grooves. */}
      <directionalLight position={[-2, 1.2, 6]} intensity={0.6} />

      {/* frames={1} because nothing in here moves: render the cube once. */}
      {/* Dialled well down: at full strength the softboxes reflect off every
          dark material and the record, the knobs and the arm base all go grey. */}
      <Environment resolution={256} frames={1} environmentIntensity={0.4}>
        {/* The stage itself, so metal reflects a bright room rather than void. */}
        <color attach="background" args={["#dcdcde"]} />
        {/* overhead softbox */}
        <Lightformer
          form="rect"
          intensity={3}
          position={[0, 6, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 10, 1]}
        />
        {/* key and fill panels, at the height the chrome will pick them up */}
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[6, 2.5, 4]}
          rotation={[0, -Math.PI / 3, 0]}
          scale={[7, 5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          position={[-7, 2.5, -3]}
          rotation={[0, Math.PI / 2.4, 0]}
          scale={[7, 5, 1]}
        />
        {/* A long thin strip: this is the highlight that rolls along the arm. */}
        <Lightformer
          form="rect"
          intensity={1.4}
          position={[-2, 5, 8]}
          rotation={[-Math.PI / 5, 0, 0]}
          scale={[9, 3.5, 1]}
        />
      </Environment>

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
