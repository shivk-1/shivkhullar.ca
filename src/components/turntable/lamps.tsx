"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * The two practical lights in the room.
 *
 * "Table Lamp" by siotech2011, CC Attribution.
 * "Donut Lamp" by CHEN, CC Attribution-NonCommercial-NoDerivs.
 *
 * The donut is served byte for byte as it was downloaded. Its licence forbids
 * distributing a modified copy, so unlike everything else here it is not
 * recompressed — no great loss at a megabyte. The table lamp is CC-BY, which
 * does allow it, and needed it: 672k triangles and 32MB as it arrived.
 *
 * Both carry their own light, placed where the model's own glowing part sits
 * rather than at its origin, and coloured from the model rather than picked:
 * the donut's emissive map is a flat #ff4a00, and the table lamp's shade is a
 * warm tint that a bare bulb behind it comes out as.
 */

/** Decoder for the table lamp's draco geometry, served from /public. */
const DRACO = "/draco/";

const TABLE = {
  url: "/models/table_lamp.glb",
  /** Height here, and what it measures in the file. Taller than the plant's
   *  2.8, which is the way round a floor lamp and a pot plant really go. */
  height: 3.1,
  modelHeight: 0.598,
  /** Its base sits below the file's origin, so it needs lifting onto the floor. */
  base: -0.14,
  centre: { x: -0.003, z: 0.0 },
  /** Dead centre of the bulb, in the file's units. */
  bulb: { x: 0, y: 0.313, z: 0 },
  at: { x: 3.15, z: -2.3 },
} as const;

const DONUT = {
  url: "/models/donut_lamp__game-ready_pbr_3d_model.glb",
  /** Sized across rather than up: it is a ring lying on the floor. A shade
   *  wider than the record it sits beside, which is 2.56 across. */
  width: 2.9,
  modelWidth: 0.352,
  base: -0.079,
  centre: { x: 1.537, z: 0.982 },
  /** Middle of the ring, which is where its glow comes from. */
  ring: { x: 1.537, y: -0.007, z: 0.982 },
  at: { x: -4.17, z: 0.16 },
} as const;

/**
 * Lamps light the room; they are not lit by it, and they do not block it. The
 * table lamp is a quarter of a million triangles, and putting it through six
 * cube faces of its own shadow map would cost more than its own shadow is
 * worth — the shade would barely show it.
 */
function prepare(scene: THREE.Object3D) {
  const root = scene.clone(true);
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    // The table lamp keeps the normals it shipped with, and so keeps most of
    // its triangles. Stripping them lets it weld and simplify — 672k down to
    // 42k — but its shade is two near-coincident translucent layers, and
    // welding collapses them into each other: the shade comes back streaked
    // with z-fighting at any triangle count. Correct beats small here.
  });
  return root;
}

export function Lamps() {
  return (
    <>
      <TableLamp />
      <DonutLamp />
    </>
  );
}

function TableLamp() {
  const { scene } = useGLTF(TABLE.url, DRACO);
  const model = useMemo(() => prepare(scene), [scene]);

  const scale = TABLE.height / TABLE.modelHeight;
  const lift = -TABLE.base * scale;

  return (
    <group position={[TABLE.at.x, 0, TABLE.at.z]}>
      <primitive
        object={model}
        scale={scale}
        position={[-TABLE.centre.x * scale, lift, -TABLE.centre.z * scale]}
      />

      {/*
        Warm, and the brighter of the two: it is the key light for the whole
        room. decay 2 is the real inverse square, so the intensity is large and
        the falloff does the work rather than a hand-drawn radius.
      */}
      <pointLight
        position={[
          (TABLE.bulb.x - TABLE.centre.x) * scale,
          TABLE.bulb.y * scale + lift,
          (TABLE.bulb.z - TABLE.centre.z) * scale,
        ]}
        color="#ffb066"
        intensity={140}
        distance={34}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.4}
        shadow-camera-far={26}
        shadow-bias={-0.002}
        shadow-normalBias={0.03}
      />
    </group>
  );
}

function DonutLamp() {
  const { scene } = useGLTF(DONUT.url, DRACO);
  const model = useMemo(() => prepare(scene), [scene]);

  const scale = DONUT.width / DONUT.modelWidth;
  const lift = -DONUT.base * scale;

  return (
    <group position={[DONUT.at.x, 0, DONUT.at.z]}>
      <primitive
        object={model}
        scale={scale}
        position={[-DONUT.centre.x * scale, lift, -DONUT.centre.z * scale]}
      />

      {/*
        The orange one, and deliberately the weaker. It sits on the floor, so
        its job is to wash the ground and throw colour up the near side of the
        deck, not to compete with the lamp for the room.
      */}
      <pointLight
        position={[0, DONUT.ring.y * scale + lift + 0.15, 0]}
        color="#ff4a00"
        intensity={48}
        distance={22}
        decay={2}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-near={0.3}
        shadow-camera-far={15}
        shadow-bias={-0.003}
        shadow-normalBias={0.04}
      />
    </group>
  );
}

useGLTF.preload(TABLE.url, DRACO);
useGLTF.preload(DONUT.url, DRACO);
