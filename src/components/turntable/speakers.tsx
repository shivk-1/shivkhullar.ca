"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * "Speaker with stand" by Halil Kantarci on sketchfab, CC Attribution.
 *
 * The file holds three separate things — a speaker sat on its stand, a second
 * speaker on the floor, and a bare stand. Only the first is wanted, so the
 * other two are matched by name and dropped on the way in, which keeps their
 * geometry out of the draw and the shadow pass as well as out of shot.
 */
const MODEL = "/models/speaker_with_stand.glb";

/** Height of the stand-mounted speaker here. The plant is 2.8, so this reads
 *  as the larger object, which is the way round it would really be. */
const HEIGHT = 3.1;
/** ...and what it measures in the file, which sets the scale for all three. */
const MODEL_HEIGHT = 0.63;

/**
 * Corner of the plinth they are grouped off: the one that reads as top left on
 * screen, which is the back left in world terms.
 */
const AIM = new THREE.Vector3(-2.3, 0, -1.8);

/**
 * Heading of the floor direction that points back at the viewer. Cabinets are
 * turned this far off the corner so their fronts are readable rather than
 * three-quarters away. Held as a constant, not read from the live camera, so
 * they do not swivel as it orbits.
 */
const VIEWER_HEADING = 0.5399;
const TOWARD_VIEWER = 0.5;

/**
 * What gets shown, in the file's own units.
 *
 * `front` is the heading its baffle already points along inside the file,
 * which aiming has to cancel — measured from the area weighted average normal
 * of the badge mesh put through its node's world matrix. `out` and `side` are
 * where it stands, out from the corner and across.
 *
 * Kept as a list because the file holds two more pieces at their own headings
 * (the floor speaker sits at 1.2025), and putting either back is a matter of
 * adding a row.
 */
const PIECES = [
  {
    name: "speaker on its stand",
    match: /^(standLegs|standTable|speakerBody|displayEtc|glass|panel)_(?!2_)/,
    centre: { x: -0.015, z: -0.022 },
    front: 0.5949,
    out: 1.45,
    side: 0.15,
  },
];

/** One piece, lifted out of a clone of the loaded scene. */
function extract(scene: THREE.Object3D, match: RegExp) {
  // Cloned rather than used directly: useGLTF hands back one cached scene, and
  // pruning the original would mutate what every other caller sees. Geometries
  // and materials are shared by the clone, so three of these cost very little.
  const root = scene.clone(true);

  const spare: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return;
    if (!match.test(node.name)) {
      spare.push(node);
      return;
    }
    // gltf carries no shadow flags of its own.
    node.castShadow = true;
    node.receiveShadow = true;
  });
  for (const node of spare) node.removeFromParent();

  return root;
}

export function Speakers() {
  const { scene } = useGLTF(MODEL);

  const pieces = useMemo(() => {
    const scale = HEIGHT / MODEL_HEIGHT;
    const out = AIM.clone().normalize(); // away from the deck's centre
    const side = new THREE.Vector3(out.z, 0, -out.x); // across that

    return PIECES.map((piece) => {
      const position = AIM.clone()
        .addScaledVector(out, piece.out)
        .addScaledVector(side, piece.side);

      const toCorner = AIM.clone().sub(position);
      const atCorner = Math.atan2(toCorner.x, toCorner.z);
      const heading = THREE.MathUtils.lerp(
        atCorner,
        VIEWER_HEADING,
        TOWARD_VIEWER,
      );

      return {
        key: piece.name,
        object: extract(scene, piece.match),
        position,
        rotation: heading - piece.front,
        scale,
        offset: [-piece.centre.x * scale, 0, -piece.centre.z * scale] as const,
      };
    });
  }, [scene]);

  return (
    <>
      {pieces.map((piece) => (
        <group
          key={piece.key}
          position={piece.position}
          rotation={[0, piece.rotation, 0]}
        >
          {/* Nudged so its own footprint, not the file's origin, lands here. */}
          <primitive
            object={piece.object}
            scale={piece.scale}
            position={piece.offset}
          />
        </group>
      ))}
    </>
  );
}

useGLTF.preload(MODEL);
