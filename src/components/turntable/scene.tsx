"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
} from "@react-three/drei";
import { Plant } from "./plant";
import { Turntable, type TurntableProps } from "./turntable";

/**
 * The deck on a plain white stage.
 *
 * The environment is built in-scene from lightformers rather than loaded as an
 * hdr: drei's presets fetch their map from a cdn, which would make the page
 * depend on a third party to render at all. Chrome and brushed aluminium need
 * something to reflect — with directional lights alone, metal renders black —
 * so a softbox rig stands in for a studio.
 *
 * The scene is tiny in geometry (under 6k triangles) and entirely bound by
 * fragment cost, so everything tuned for speed here is about how many pixels
 * get shaded, not how many things are on screen.
 */
export function TurntableScene(props: TurntableProps) {
  /**
   * Starts below native retina density on purpose. At dpr 2 this is a four
   * megapixel pass every frame for a deck that reads identically at 1.5, and
   * the monitor below moves it either way once it has measured the machine.
   */
  const [dpr, setDpr] = useState(1.5);

  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [4.8, 4.8, 8.0], fov: 34 }}
      gl={{
        // Transparent so the page's own white shows through and the canvas can
        // sit under the layout without a seam.
        alpha: true,
        antialias: true,
        // Asks for the discrete gpu on machines that have both.
        powerPreference: "high-performance",
      }}
      style={{ touchAction: "none" }}
    >
      {/*
        Resolution follows what the machine can actually hold. drei aims at
        the display's own refresh rate, so this targets 90+ on a promotion
        panel and 60 elsewhere rather than a fixed number.
      */}
      <PerformanceMonitor
        onIncline={() => setDpr(2)}
        onDecline={() => setDpr(1)}
      />

      {/* Kept low on purpose. Flat fill washes the grooves out; the disc only
          reads as vinyl when a hard key sweeps across the rings. */}
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[4, 7, 4]}
        intensity={1.15}
        castShadow
        // 1024 rather than 2048: the shadow map is redrawn every frame, and at
        // this scene's size the extra resolution buys nothing but fill rate.
        shadow-mapSize={[1024, 1024]}
        // Tight bounds around the deck, so the map's texels are spent on it
        // instead of on empty floor.
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        // normalBias handles acne on the curved parts without the peter
        // panning a large constant bias would cause on the plinth.
        shadow-normalBias={0.02}
        shadow-bias={-0.0004}
      />
      {/* Grazing light purely for the grooves. The opposite-side fill this
          used to need is now covered by the environment. */}
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

      {/* Stood off the deck's far right corner, close enough to read as the
          same room and far enough not to crowd the tonearm. It places itself
          against the canvas shape, so it is given no position here. */}
      <Plant />

      {/*
        The floor. A shadow material draws nothing except where a shadow lands,
        so the page's own white is the floor and there is no horizon edge to
        give a plane away — the deck reads as sitting on a white room that
        carries on past the viewport.
      */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial transparent opacity={0.16} depthWrite={false} />
      </mesh>

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
