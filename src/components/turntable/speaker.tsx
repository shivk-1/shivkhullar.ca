"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * "Speaker with stand" by Halil Kantarci on sketchfab, CC Attribution.
 *
 * The file holds two assemblies: a speaker sat on its stand, and separately a
 * bare stand with a second speaker on the floor beside it. Only the first is
 * wanted here, and every node of the second is suffixed, so they are dropped
 * on the way in — which also keeps their thirty one thousand triangles out of
 * both the draw and the shadow pass.
 */
const MODEL = "/models/speaker_with_stand.glb";
const SECOND_ASSEMBLY = /_2_/;

/** Height and footprint centre of the wanted assembly, in the file's units. */
const MODEL_HEIGHT = 0.63;
const MODEL_CENTRE = { x: -0.015, z: -0.022 };

/** What it stands at here. One unit is roughly a decimetre, as with the deck. */
const HEIGHT = 2.2;

/**
 * Heading the baffle already points along inside the file, which aiming has to
 * cancel out. The cabinet is turned within the model and its own node carries
 * a rotation on top, so this is neither zero nor a right angle.
 *
 * Taken from the area weighted average normal of each mesh, put through its
 * node's world matrix. Two headings come back, 180 apart: the drivers and the
 * badge face 34.1, and `panel` — thirteen thousand triangles of knobs and
 * binding posts, so the amplifier panel rather than the baffle — faces -145.9.
 */
const MODEL_FRONT = 0.5949;

/**
 * Corner of the plinth it points at: the one that reads as top left on screen,
 * which is the back left in world terms. It stands off that corner by the same
 * gap the plant keeps on the far side.
 */
const AIM = new THREE.Vector3(-2.3, 0, -1.8);
const GAP = 1.45;

export function Speaker() {
  const { scene } = useGLTF(MODEL);

  const model = useMemo(() => {
    // Cloned rather than used directly: useGLTF hands back one cached scene,
    // and pruning the original would mutate what every other caller sees.
    // Geometries and materials are shared by the clone, so this is cheap.
    const root = scene.clone(true);

    const spare: THREE.Object3D[] = [];
    root.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      if (SECOND_ASSEMBLY.test(node.name)) spare.push(node);
      else {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    // gltf carries no shadow flags of its own, so they are set above.
    for (const node of spare) node.removeFromParent();

    return root;
  }, [scene]);

  const place = useMemo(() => {
    const out = AIM.clone().normalize(); // away from the deck's centre
    const position = AIM.clone().addScaledVector(out, GAP);
    const facing = AIM.clone().sub(position);

    return {
      position,
      rotation: Math.atan2(facing.x, facing.z) - MODEL_FRONT,
      scale: HEIGHT / MODEL_HEIGHT,
    };
  }, []);

  return (
    <group position={place.position} rotation={[0, place.rotation, 0]}>
      {/*
        The assembly's footprint is not quite centred on the file's origin, so
        it is nudged back onto it before the group above turns and places it.
      */}
      <primitive
        object={model}
        scale={place.scale}
        position={[
          -MODEL_CENTRE.x * place.scale,
          0,
          -MODEL_CENTRE.z * place.scale,
        ]}
      />
    </group>
  );
}

useGLTF.preload(MODEL);
