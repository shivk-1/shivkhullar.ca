"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ceramicMaps, leafMaps } from "./textures";

/**
 * A potted rubber plant standing beside the deck.
 *
 * Built from primitives like everything else in this scene, and modelled after
 * "Indoor Plant Decor" by Jerovdl on sketchfab. That model is 1,943,302 faces —
 * over three hundred times the whole rest of this scene put together — and its
 * download is behind an account, so this is a rebuild of the same plant at
 * roughly seven hundred triangles: nothing to download, nothing to draw.
 */

/** Total height, pot base to the highest leaf. One unit is roughly a decimetre. */
const HEIGHT = 2.8;

const POT = { r: 0.4, h: 0.95 };
const SOIL_Y = POT.h * 0.9;

const LEAVES = 19;
/** How far a leaf springs from the plant's centre line before it starts. */
const LEAF_OFFSET = 0.13;

/**
 * Where it stands: behind the deck and left of centre.
 *
 * It used to sit off the plinth's near right corner and slide further out as
 * the canvas widened. That space belongs to the table lamp now, and the two do
 * not both fit there — the lamp alone wants about half the frame's width, and
 * on a narrow canvas there is only a third of it to the right of where the
 * plant stood. So the plant moved rather than the lamp shrinking, and it no
 * longer needs to slide: nothing is competing for where it is now.
 */
const HOME = new THREE.Vector3(1.37, 0, -3.26);
/** Phyllotaxis: successive leaves this far apart never line up into rows. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Deterministic, so the plant is the same one on every render and reload. */
function seq(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * One leaf as a parametric surface, built once and shared by every leaf on the
 * plant. The blade is widest past halfway and comes to a point at both ends,
 * droops under its own weight, and is cupped either side of the midrib — the
 * cup is what puts a highlight down the centre instead of a flat sheen.
 */
function leafGeometry() {
  const SEGS_U = 12;
  const SEGS_V = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= SEGS_U; i++) {
    const u = i / SEGS_U;
    // The exponent pushes the widest point past the middle, as a real leaf.
    // Narrow: a rubber plant's blade is roughly a third as wide as it is long.
    const half = 0.3 * Math.sin(Math.PI * Math.pow(u, 0.62));
    const droop = -0.26 * u * u;

    for (let j = 0; j <= SEGS_V; j++) {
      const v = (j / SEGS_V) * 2 - 1;
      positions.push(u, droop + 0.5 * half * v * v, v * half);
      uvs.push(u, (v + 1) / 2);
    }
  }

  const stride = SEGS_V + 1;
  for (let i = 0; i < SEGS_U; i++) {
    for (let j = 0; j < SEGS_V; j++) {
      const a = i * stride + j;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

/** Half profile of the pot, revolved: rounded foot, straight side, rolled rim. */
function potGeometry() {
  const { r, h } = POT;
  const profile = [
    [0, 0],
    [r * 0.6, 0],
    [r * 0.85, h * 0.05],
    [r * 0.96, h * 0.14],
    [r, h * 0.3],
    [r, h * 0.94],
    [r * 0.99, h],
    [r * 0.9, h],
    [r * 0.88, h * 0.92],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  return new THREE.LatheGeometry(profile, 40);
}

/** How high up the plant a leaf sits, and how big and how tilted it is there. */
function leafAt(index: number) {
  const t = index / (LEAVES - 1);
  const rise = Math.pow(t, 0.82);

  return {
    y: THREE.MathUtils.lerp(SOIL_Y + 0.18, HEIGHT - 0.42, rise),
    azimuth: index * GOLDEN_ANGLE + seq(index) * 0.5,
    // Low leaves hang out and down, high ones reach up. That spread is most of
    // what stops a stack of leaves reading as a shrub.
    pitch:
      THREE.MathUtils.lerp(-0.42, 0.46, rise) + (seq(index * 3.7) - 0.5) * 0.3,
    // Biggest through the middle of the plant, smallest at the crown. Sized so
    // the foliage is about half as wide as the plant is tall, which is the
    // proportion of the reference; larger and it reads as a shrub.
    size: 0.44 + 0.26 * Math.sin(Math.PI * Math.pow(t, 0.7)) - t * 0.06,
  };
}

export function Plant() {
  const maps = useMemo(
    () => ({
      leaf: leafMaps(),
      ceramic: ceramicMaps(),
    }),
    [],
  );

  const geometry = useMemo(
    () => ({ leaf: leafGeometry(), pot: potGeometry() }),
    [],
  );

  useEffect(() => {
    return () => {
      for (const set of Object.values(maps)) {
        if (set instanceof THREE.Texture) set.dispose();
        else for (const map of Object.values(set)) map?.dispose();
      }
      for (const value of Object.values(geometry)) value.dispose();
    };
  }, [maps, geometry]);

  return (
    <group position={HOME}>
      <mesh geometry={geometry.pot} castShadow receiveShadow>
        <meshStandardMaterial
          color="#dcd7ce"
          roughnessMap={maps.ceramic.roughness}
          normalMap={maps.ceramic.normal}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          roughness={1}
          metalness={0}
          // The rim turns back inside, so the pot is open at the top and the
          // inner wall is only ever seen from the far side.
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Soil, sunk just below the rim. */}
      <mesh position={[0, SOIL_Y - 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[POT.r * 0.87, POT.r * 0.87, 0.06, 32]} />
        <meshStandardMaterial color="#3a2b1e" roughness={1} />
      </mesh>

      <Stems />

      <Leaves geometry={geometry.leaf} maps={maps.leaf} />
    </group>
  );
}

/**
 * Every leaf drawn in one call.
 *
 * They only differ by where they sit and how they are turned and scaled, which
 * is exactly what an instance matrix carries, so nineteen meshes collapse into
 * one — and into one more in the shadow pass, which they all cast into.
 */
function Leaves({
  geometry,
  maps,
}: {
  geometry: THREE.BufferGeometry;
  maps: ReturnType<typeof leafMaps>;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    const step = new THREE.Matrix4();

    for (let i = 0; i < LEAVES; i++) {
      const leaf = leafAt(i);
      // Up the stems, turned to its own bearing, out from the cluster, then
      // pitched and sized: the same chain the nested groups used to describe.
      matrix.makeTranslation(0, leaf.y, 0);
      matrix.multiply(step.makeRotationY(leaf.azimuth));
      matrix.multiply(step.makeTranslation(LEAF_OFFSET, 0, 0));
      matrix.multiply(step.makeRotationZ(leaf.pitch));
      matrix.multiply(step.makeScale(leaf.size, leaf.size, leaf.size));
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    // Without this the bounds are still those of a single unplaced leaf, and
    // the whole plant blinks out as soon as that one leaf leaves the frustum.
    mesh.computeBoundingSphere();
  }, []);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, LEAVES]}
      castShadow
      frustumCulled={false}
    >
      <meshStandardMaterial
        map={maps.map}
        roughnessMap={maps.roughness}
        normalMap={maps.normal}
        normalScale={new THREE.Vector2(0.5, 0.5)}
        roughness={1}
        metalness={0}
        // A leaf has no back face to speak of, and is seen from both.
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

/** The bare stems the leaves come off, splayed slightly out of the soil. */
function Stems() {
  const stems = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => {
        const azimuth = (i / 4) * Math.PI * 2 + 0.6;
        const lean = 0.05 + seq(i * 5.3) * 0.06;
        const top = HEIGHT * (0.62 + seq(i * 2.9) * 0.26);
        return { azimuth, lean, height: top - SOIL_Y };
      }),
    [],
  );

  return (
    <>
      {stems.map((stem, i) => (
        <group key={i} rotation={[0, stem.azimuth, 0]}>
          <mesh
            // Leant from its foot rather than its middle, so every stem still
            // meets the soil however far it leans.
            position={[
              (Math.sin(stem.lean) * stem.height) / 2,
              SOIL_Y + (Math.cos(stem.lean) * stem.height) / 2,
              0,
            ]}
            rotation={[0, 0, -stem.lean]}
            castShadow
          >
            <cylinderGeometry args={[0.018, 0.032, stem.height, 8]} />
            <meshStandardMaterial color="#4a6b32" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </>
  );
}
