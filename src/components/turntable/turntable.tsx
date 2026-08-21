"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { grooveNormalMap, grooveRoughnessMap } from "./textures";

/**
 * Everything is modelled from primitives rather than loaded as a glb: the deck
 * is boxes and cylinders, so a mesh file would be pure download for no detail.
 * One unit is roughly a decimetre, which keeps the numbers below readable.
 */
const PLINTH = { w: 4.6, h: 0.5, d: 3.6 };
const PLATE = { w: 4.4, h: 0.07, d: 3.4 };

/** Platter sits right of centre, leaving the left third for the controls. */
const PLATTER = { x: 0.55, z: -0.05, r: 1.35, h: 0.13 };
const RECORD = { r: 1.28, h: 0.028 };
const LABEL_R = 0.44;

/** Outer and inner limits of the playable band, as radii on the disc. */
const GROOVE_OUT = 1.2;
const GROOVE_IN = 0.52;

const ARM = { x: -1.15, z: -1.15, length: 2.0 };
const ARM_REST = -1.55;

const PLATE_TOP = PLINTH.h + PLATE.h;
const PLATTER_TOP = PLATE_TOP + PLATTER.h;
const RECORD_TOP = PLATTER_TOP + RECORD.h;

/**
 * Angle that puts the stylus down at radius `r` on the disc.
 *
 * The tip travels a circle of `ARM.length` about the pivot, so the angle for a
 * given groove radius falls out of the triangle pivot-spindle-tip. Solving it
 * rather than hand-tuning keeps the stylus on the record when any of the
 * dimensions above change.
 */
function armAngle(radius: number) {
  const dx = PLATTER.x - ARM.x;
  const dz = PLATTER.z - ARM.z;
  const span = Math.hypot(dx, dz);
  const base = Math.atan2(-dz, dx);
  const cos =
    (ARM.length * ARM.length + span * span - radius * radius) /
    (2 * ARM.length * span);
  return base + Math.acos(THREE.MathUtils.clamp(cos, -1, 1));
}

export type TurntableProps = {
  playing: boolean;
  /** Platter speed. 33 and 45 are the real ones; the slider allows between. */
  rpm: number;
  /** 0 at the start of the track, 1 at the end. Drives the stylus inward. */
  progress: number;
  /** Album art for the centre label. Falls back to a plain label when absent. */
  artwork?: string;
};

export function Turntable({ playing, rpm, progress, artwork }: TurntableProps) {
  const disc = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);

  const roughnessMap = useMemo(grooveRoughnessMap, []);
  const normalMap = useMemo(grooveNormalMap, []);
  const label = useArtwork(artwork);

  useEffect(() => {
    return () => {
      roughnessMap.dispose();
      normalMap.dispose();
    };
  }, [roughnessMap, normalMap]);

  useFrame((_, delta) => {
    // Spin only while playing, and leave the disc wherever it stopped: a record
    // that snaps back to zero on pause reads as a video scrubbing, not a deck.
    if (disc.current && playing) {
      disc.current.rotation.y += delta * (rpm / 60) * Math.PI * 2;
    }

    if (arm.current) {
      const target = playing
        ? armAngle(THREE.MathUtils.lerp(GROOVE_OUT, GROOVE_IN, progress))
        : ARM_REST;
      // Eased rather than set: the arm should swing over and settle, which is
      // the one motion that sells the deck as a mechanism.
      arm.current.rotation.y = THREE.MathUtils.damp(
        arm.current.rotation.y,
        target,
        3,
        delta,
      );
    }
  });

  return (
    <group>
      {/* plinth */}
      <mesh position={[0, PLINTH.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[PLINTH.w, PLINTH.h, PLINTH.d]} />
        <meshStandardMaterial color="#b3855f" roughness={0.72} />
      </mesh>

      {/* top plate */}
      <mesh position={[0, PLINTH.h + PLATE.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[PLATE.w, PLATE.h, PLATE.d]} />
        <meshStandardMaterial
          color="#dedbd4"
          roughness={0.45}
          metalness={0.18}
        />
      </mesh>

      {/* platter */}
      <mesh
        position={[PLATTER.x, PLATE_TOP + PLATTER.h / 2, PLATTER.z]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[PLATTER.r, PLATTER.r, PLATTER.h, 64]} />
        <meshStandardMaterial color="#8d9095" roughness={0.4} metalness={0.55} />
      </mesh>

      {/* record, label and spindle turn together */}
      <group ref={disc} position={[PLATTER.x, PLATTER_TOP, PLATTER.z]}>
        <mesh position={[0, RECORD.h / 2, 0]} castShadow>
          <cylinderGeometry args={[RECORD.r, RECORD.r, RECORD.h, 128]} />
          <meshStandardMaterial
            color="#0c0c0d"
            roughness={0.32}
            metalness={0.15}
            roughnessMap={roughnessMap}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(0.7, 0.7)}
          />
        </mesh>

        {/* Sits a hair proud of the disc so it never z-fights the vinyl. */}
        <mesh position={[0, RECORD.h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[LABEL_R, 64]} />
          <meshStandardMaterial
            color={label ? "#ffffff" : "#4a3a31"}
            map={label ?? undefined}
            roughness={0.75}
          />
        </mesh>

        <mesh position={[0, RECORD.h + 0.06, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.12, 16]} />
          <meshStandardMaterial color="#cfd2d6" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      <Tonearm ref={arm} />

      {/* control knobs */}
      {[-0.35, 0.25].map((z) => (
        <mesh key={z} position={[-1.75, PLATE_TOP + 0.06, z]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.12, 24]} />
          <meshStandardMaterial color="#26262a" roughness={0.5} />
        </mesh>
      ))}

      <PitchFader rpm={rpm} />
    </group>
  );
}

/** Pivot post, arm tube and headshell, grouped so one rotation swings all three. */
function Tonearm({ ref }: { ref: React.Ref<THREE.Group> }) {
  return (
    <group position={[ARM.x, PLATE_TOP, ARM.z]}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.28, 24]} />
        <meshStandardMaterial color="#3a3a3e" roughness={0.4} metalness={0.6} />
      </mesh>

      <group ref={ref} position={[0, 0.26, 0]} rotation={[0, ARM_REST, 0]}>
        {/* Arm runs along +x from the pivot; the group's y rotation aims it. */}
        {/* Rolled onto its side: a cylinder is built along y, and the arm runs
            along the group's +x. */}
        <mesh
          position={[ARM.length / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.028, 0.028, ARM.length, 16]} />
          <meshStandardMaterial
            color="#d5d7da"
            roughness={0.25}
            metalness={0.75}
          />
        </mesh>

        <mesh position={[ARM.length, -0.05, 0]} castShadow>
          <boxGeometry args={[0.2, 0.1, 0.12]} />
          <meshStandardMaterial color="#1d1d20" roughness={0.5} />
        </mesh>

        {/* Counterweight, so the arm reads as balanced about its pivot. */}
        <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.18, 20]} />
          <meshStandardMaterial color="#2a2a2e" roughness={0.45} />
        </mesh>
      </group>
    </group>
  );
}

/** Cream pitch slider on the front right, its nub tracking the current rpm. */
function PitchFader({ rpm }: { rpm: number }) {
  const travel = THREE.MathUtils.mapLinear(
    THREE.MathUtils.clamp(rpm, 33, 45),
    33,
    45,
    -0.28,
    0.28,
  );

  return (
    <group position={[1.55, PLATE_TOP + 0.02, 1.25]}>
      <mesh receiveShadow>
        <boxGeometry args={[0.9, 0.05, 0.26]} />
        <meshStandardMaterial color="#e8e0c6" roughness={0.6} />
      </mesh>
      <mesh position={[travel, 0.06, 0]} castShadow>
        <boxGeometry args={[0.14, 0.09, 0.2]} />
        <meshStandardMaterial color="#8d8d92" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Loads album art into a texture, swapping it as the selected track changes. */
function useArtwork(url?: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }

    let stale = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(url, (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      if (stale) {
        loaded.dispose();
        return;
      }
      setTexture(loaded);
    });

    return () => {
      stale = true;
    };
  }, [url]);

  // Disposed on swap rather than in the loader callback, so the texture stays
  // alive for as long as a material is actually pointing at it.
  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return texture;
}
