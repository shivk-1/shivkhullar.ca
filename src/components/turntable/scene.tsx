"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
} from "@react-three/drei";
import { Lamps } from "./lamps";
import { Plant } from "./plant";
import { Speakers } from "./speakers";
import { Turntable, type TurntableProps } from "./turntable";

/**
 * The deck in a dark room, lit only by the two lamps standing in it.
 *
 * There are no abstract lights here any more: every photon comes from a lamp
 * that is visibly in shot, at the position of that lamp's own glowing part.
 * Both are warm — the table lamp amber through its shade, the donut a flat
 * orange — so where they overlap they add up rather than fight, and the deck
 * ends up lit warm from the right and rimmed orange from the left.
 *
 * The camera sits further back than it did. Five objects on the floor need
 * more floor than three did, and at the old distance the lamps had nowhere to
 * stand that was not off the bottom of the frame.
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
      camera={{ position: [6.0, 6.0, 10.0], fov: 34 }}
      gl={{
        // Transparent so the page's own black shows through past the floor,
        // and the room reads as carrying on into the dark.
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

      {/*
        Just enough that unlit faces are dark rather than pure black, and warm
        so it reads as spill off the lamps instead of a second light source.
      */}
      <ambientLight color="#ffb27a" intensity={0.09} />

      {/*
        A dark room rather than a studio. Metal with nothing to reflect renders
        black, so this is kept alive at a fraction of its old strength purely
        so the chrome on the tonearm and the speaker's badge still catch
        something. The one panel left is warm and overhead, standing in for the
        table lamp's throw bouncing off a ceiling.
      */}
      <Environment resolution={128} frames={1} environmentIntensity={0.12}>
        <color attach="background" args={["#0a0709"]} />
        <Lightformer
          form="rect"
          intensity={0.9}
          color="#ffc48f"
          position={[3, 6, 3]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[9, 9, 1]}
        />
      </Environment>

      <Turntable {...props} />

      {/* Stood off the deck's far right corner, close enough to read as the
          same room and far enough not to crowd the tonearm. It places itself
          against the canvas shape, so it is given no position here. */}
      <Plant />

      {/* Loaded, so they suspend; the rest of the scene draws without them. */}
      <Suspense fallback={null}>
        <Speakers />
      </Suspense>
      <Suspense fallback={null}>
        <Lamps />
      </Suspense>

      {/*
        The floor is a real surface now, not a shadow catcher. It has to be:
        the lamps have to land on something for their pools to be visible, and
        a shadow material would have shown their light as nothing at all. Left
        slightly glossy so each lamp lays a soft streak of itself across it.
      */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#0d0b0d"
          roughness={0.58}
          metalness={0.12}
        />
      </mesh>

      <OrbitControls
        makeDefault
        enablePan={false}
        // Widened with the camera: it now rests about thirteen units out, so
        // the old ceiling of fourteen left almost nothing to pull back to.
        minDistance={6}
        maxDistance={24}
        // Stops the camera dropping under the plinth, where there is nothing
        // modelled and the deck would read as a floating slab.
        maxPolarAngle={Math.PI / 2 - 0.06}
        minPolarAngle={0.18}
        enableDamping
        dampingFactor={0.08}
        // Raised above the platter so the tall objects behind the deck clear
        // the top of the frame, and dropped a little from where it was now
        // that the camera has moved back and bought that room another way.
        target={[0, 0.95, 0]}
      />
    </Canvas>
  );
}
