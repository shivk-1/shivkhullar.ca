"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  brushedMaps,
  feltMaps,
  groundShadowMap,
  vinylMaps,
  woodMaps,
} from "./textures";

/**
 * Everything is modelled from primitives rather than loaded as a glb: the deck
 * is boxes and cylinders, so a mesh file would be pure download for no detail.
 * One unit is roughly a decimetre, which keeps the numbers below readable.
 */
const PLINTH = { w: 4.6, h: 0.5, d: 3.6 };
const PLATE = { w: 4.4, h: 0.07, d: 3.4 };

/** Platter sits right of centre, leaving the left third for the controls. */
const PLATTER = { x: 0.55, z: -0.05, r: 1.35, h: 0.13 };
const MAT = { r: 1.3, h: 0.014 };
const RECORD = { r: 1.28, h: 0.028 };
const LABEL_R = 0.44;

/**
 * Outer and inner limits of the playable band, as radii on the disc. The inner
 * end stops around the middle of the record rather than running in to the
 * label, which keeps the whole of a track inside a ten degree sweep.
 */
const GROOVE_OUT = 1.2;
const GROOVE_IN = 0.86;

/**
 * Where the stylus parks, as a radius from the spindle. Outside the platter,
 * so nothing is hovering over the record while the deck is stopped.
 */
const REST_RADIUS = 1.62;

const ARM = { x: -1.15, z: -1.15, length: 2.0 };
/** The stylus overhangs the end of the tube, so it reaches further than it. */
const STYLUS_REACH = ARM.length + 0.13;
/** Height of the arm's pivot above the top plate. */
const ARM_PIVOT_Y = 0.4;

const PLATE_TOP = PLINTH.h + PLATE.h;
const PLATTER_TOP = PLATE_TOP + PLATTER.h;
const MAT_TOP = PLATTER_TOP + MAT.h;

const TAU = Math.PI * 2;

/** World size of the plane the ground shadow is painted onto. */
const GROUND_SPREAD = 11;

/**
 * Platter speed is scaled by how fast the track actually is, against a 120bpm
 * reference. Clamped so a 70bpm ballad still turns and a drum and bass track
 * does not strobe.
 */
const BPM_REFERENCE = 120;
const BPM_SCALE = { min: 0.55, max: 1.9 };

/**
 * Angle that puts the stylus down at radius `r` on the disc.
 *
 * The tip travels a circle of `STYLUS_REACH` about the pivot, so the angle for
 * a given groove radius falls out of the triangle pivot-spindle-tip. Solving it
 * rather than hand-tuning keeps the stylus on the record when any of the
 * dimensions above change.
 *
 * The triangle has two solutions, one either side of the pivot-spindle line.
 * This takes the near one for every radius including the parked one, so the
 * arm swings a few degrees within one arc. Mixing the two roots is what makes
 * an arm sweep the whole width of the deck to reach the lead-in groove.
 */
function armAngle(radius: number) {
  const dx = PLATTER.x - ARM.x;
  const dz = PLATTER.z - ARM.z;
  const span = Math.hypot(dx, dz);
  const base = Math.atan2(-dz, dx);
  const cos =
    (STYLUS_REACH * STYLUS_REACH + span * span - radius * radius) /
    (2 * STYLUS_REACH * span);
  return base - Math.acos(THREE.MathUtils.clamp(cos, -1, 1));
}

/**
 * Parked angle, solved the same way as every playing angle so the two stay in
 * step. Roughly twelve degrees out from the lead-in groove.
 */
const ARM_REST = armAngle(REST_RADIUS);

export type TurntableProps = {
  playing: boolean;
  /** Nominal platter speed. 33 and 45 are the real ones. */
  rpm: number;
  /** Detected tempo of the current track, or null while it is unknown. */
  bpm?: number | null;
  /** 0 at the start of the track, 1 at the end. Drives the stylus inward. */
  progress: number;
  /** Album art for the centre label. Falls back to a plain label when absent. */
  artwork?: string;
};

export function Turntable({
  playing,
  rpm,
  bpm,
  progress,
  artwork,
}: TurntableProps) {
  const disc = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  /** Current platter speed in revolutions per second, eased toward target. */
  const speed = useRef(0);

  const maps = useMemo(
    () => ({
      vinyl: vinylMaps(),
      wood: woodMaps(),
      brushed: brushedMaps(),
      felt: feltMaps(),
      ground: { map: groundShadowMap(PLINTH.w, PLINTH.d, GROUND_SPREAD) },
    }),
    [],
  );
  const label = useArtwork(artwork);

  useEffect(() => {
    return () => {
      for (const set of Object.values(maps)) {
        for (const map of Object.values(set)) map?.dispose();
      }
    };
  }, [maps]);

  useFrame((_, delta) => {
    const scale = bpm
      ? THREE.MathUtils.clamp(bpm / BPM_REFERENCE, BPM_SCALE.min, BPM_SCALE.max)
      : 1;

    // A platter has mass: it winds up over a second or two and coasts down
    // rather than snapping between still and spinning.
    speed.current = THREE.MathUtils.damp(
      speed.current,
      playing ? (rpm * scale) / 60 : 0,
      2.2,
      delta,
    );

    // Never reset the angle: a record that snaps back to zero on pause reads as
    // video scrubbing, not as a deck.
    if (disc.current) disc.current.rotation.y += delta * speed.current * TAU;

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
      <Ground map={maps.ground.map} />

      {/* plinth: solid oak, grain running the long way */}
      <mesh position={[0, PLINTH.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[PLINTH.w, PLINTH.h, PLINTH.d]} />
        <meshStandardMaterial
          map={maps.wood.map}
          roughnessMap={maps.wood.roughness}
          normalMap={maps.wood.normal}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          // Satin lacquer over the grain, not a gloss coat.
          roughness={0.85}
          metalness={0}
        />
      </mesh>

      {/* top plate */}
      <mesh position={[0, PLINTH.h + PLATE.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[PLATE.w, PLATE.h, PLATE.d]} />
        <meshStandardMaterial
          color="#e7e4dd"
          roughness={0.5}
          metalness={0.05}
        />
      </mesh>

      {/* platter: cast aluminium, brushed in circles */}
      <mesh
        position={[PLATTER.x, PLATE_TOP + PLATTER.h / 2, PLATTER.z]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[PLATTER.r, PLATTER.r, PLATTER.h, 96]} />
        <meshStandardMaterial
          color="#a9adb3"
          roughnessMap={maps.brushed.roughness}
          normalMap={maps.brushed.normal}
          normalScale={new THREE.Vector2(0.35, 0.35)}
          roughness={1}
          metalness={0.92}
        />
      </mesh>

      {/* slipmat, inset so a ring of bare platter still shows around it */}
      <mesh
        position={[PLATTER.x, PLATTER_TOP + MAT.h / 2, PLATTER.z]}
        receiveShadow
      >
        <cylinderGeometry args={[MAT.r, MAT.r, MAT.h, 96]} />
        <meshStandardMaterial
          color="#2b2b2e"
          roughnessMap={maps.felt.roughness}
          normalMap={maps.felt.normal}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* record, label and spindle turn together */}
      <group ref={disc} position={[PLATTER.x, MAT_TOP, PLATTER.z]}>
        <mesh position={[0, RECORD.h / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[RECORD.r, RECORD.r, RECORD.h, 160]} />
          {/*
            Per-face materials. The groove maps are drawn for the cap's circular
            uv, so letting them run onto the rim would smear them down the edge.
            Cylinder groups are side, top, bottom in that order.
          */}
          <meshStandardMaterial
            attach="material-0"
            color="#090909"
            roughness={0.3}
            metalness={0.1}
          />
          <meshPhysicalMaterial
            attach="material-1"
            map={maps.vinyl.map}
            roughnessMap={maps.vinyl.roughness}
            normalMap={maps.vinyl.normal}
            normalScale={new THREE.Vector2(1.5, 1.5)}
            roughness={1}
            metalness={0}
            // Vinyl is a lacquered surface over the grooves: the sheen sits on
            // top of the relief rather than being scattered by it.
            clearcoat={0.6}
            clearcoatRoughness={0.1}
            clearcoatNormalMap={maps.vinyl.normal}
            clearcoatNormalScale={new THREE.Vector2(0.25, 0.25)}
          />
          <meshStandardMaterial
            attach="material-2"
            color="#08080a"
            roughness={0.42}
          />
        </mesh>

        {/* Sits a hair proud of the disc so it never z-fights the vinyl. */}
        <mesh
          position={[0, RECORD.h + 0.002, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[LABEL_R, 64]} />
          {/*
            Keyed on whether there is art at all. Adding a map to a material
            that compiled without one changes the shader it needs, and three
            will not notice on its own — the label just stays blank white.
          */}
          <meshStandardMaterial
            key={label ? "art" : "blank"}
            color={label ? "#ffffff" : "#4a3a31"}
            map={label ?? undefined}
            roughness={0.78}
          />
        </mesh>

        <mesh position={[0, RECORD.h + 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.026, 0.12, 20]} />
          <meshStandardMaterial
            color="#d3d7dc"
            roughness={0.16}
            metalness={1}
          />
        </mesh>
      </group>

      <Tonearm ref={arm} />
      <Controls rpm={rpm} />
      <DustCoverHinges />
    </group>
  );
}

/**
 * The shadow the deck sits in. Unlit and depth-write free so it never occludes
 * anything, and untone-mapped so the falloff stays as painted instead of being
 * lifted by the tone curve.
 */
function Ground({ map }: { map: THREE.Texture }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      // Above the floor plane that catches the cast shadow, below everything
      // else. The stretch under the plinth is hidden by the plinth itself.
      position={[0, 0.004, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[GROUND_SPREAD, GROUND_SPREAD]} />
      <meshBasicMaterial
        map={map}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/* tonearm                                                                     */
/* -------------------------------------------------------------------------- */

const CHROME = { color: "#ced3d9", roughness: 0.12, metalness: 1 } as const;
const DARK_METAL = {
  color: "#2b2b30",
  roughness: 0.34,
  metalness: 0.85,
} as const;
const PLASTIC = { color: "#131316", roughness: 0.56, metalness: 0.05 } as const;

/**
 * Base, gimbal, tube, counterweight and headshell.
 *
 * Only the group from the gimbal outward rotates; the cone, the cue lever and
 * the rest post are bolted to the plate and stay put while the arm tracks.
 */
function Tonearm({ ref }: { ref: React.Ref<THREE.Group> }) {
  return (
    <group position={[ARM.x, PLATE_TOP, ARM.z]}>
      {/* chromed base washer */}
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <cylinderGeometry args={[0.33, 0.33, 0.024, 32]} />
        <meshStandardMaterial {...CHROME} roughness={0.2} />
      </mesh>

      {/* the black bearing housing the arm stands on */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.3, 0.25, 40]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>

      {/* pivot collar, where the housing meets the gimbal */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.17, 0.07, 32]} />
        <meshStandardMaterial {...DARK_METAL} />
      </mesh>

      <CueLever />
      <ArmRest />

      <group
        ref={ref}
        position={[0, ARM_PIVOT_Y, 0]}
        rotation={[0, ARM_REST, 0]}
      >
        {/* gimbal yoke: the block the tube is slung from */}
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.17, 0.18]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>

        {/*
          Arm runs along the group's +x and the group's y rotation aims it.
          Cylinders are built along y, so every tube here is rolled a quarter
          turn about z to lie down.
        */}
        <mesh
          position={[(0.09 + ARM.length) / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.024, 0.027, ARM.length - 0.09, 24]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>

        {/* anti-skate block, sat on the tube just outboard of the pivot */}
        <mesh position={[0.26, 0.02, 0]} castShadow>
          <boxGeometry args={[0.11, 0.1, 0.11]} />
          <meshStandardMaterial {...PLASTIC} roughness={0.45} />
        </mesh>

        {/* stub behind the pivot, and the weight that balances the arm on it */}
        <mesh
          position={[-0.25, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.021, 0.021, 0.32, 20]} />
          <meshStandardMaterial {...CHROME} roughness={0.18} />
        </mesh>
        <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.05, 24]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>
        <mesh position={[-0.44, 0, 0]} castShadow>
          <boxGeometry args={[0.17, 0.19, 0.19]} />
          <meshStandardMaterial
            color="#1b1b1f"
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>

        <Headshell />
      </group>
    </group>
  );
}

/** Headshell, cartridge and stylus, angled nose-down onto the record. */
function Headshell() {
  return (
    <group position={[ARM.length, 0, 0]} rotation={[0, 0, -0.16]}>
      <mesh position={[0.07, -0.02, 0]} castShadow>
        <boxGeometry args={[0.24, 0.055, 0.12]} />
        <meshStandardMaterial {...CHROME} roughness={0.22} />
      </mesh>

      {/* finger lift */}
      <mesh position={[0.19, 0.03, 0.02]} rotation={[0, 0, 0.5]} castShadow>
        <boxGeometry args={[0.09, 0.016, 0.05]} />
        <meshStandardMaterial {...CHROME} roughness={0.25} />
      </mesh>

      {/* cartridge body */}
      <mesh position={[0.09, -0.1, 0]} castShadow>
        <boxGeometry args={[0.16, 0.1, 0.105]} />
        <meshStandardMaterial {...PLASTIC} roughness={0.42} />
      </mesh>

      {/* stylus: the only part that touches the groove */}
      <mesh position={[0.14, -0.185, 0]}>
        <coneGeometry args={[0.012, 0.075, 12]} />
        <meshStandardMaterial {...CHROME} roughness={0.1} />
      </mesh>
    </group>
  );
}

/** The little black post the arm is dropped onto when it is not tracking. */
function ArmRest() {
  // Sat under the tube at the rest angle, so the arm lands on it rather than
  // beside it. Solved from ARM_REST for the same reason armAngle is solved,
  // and far enough out along the tube to clear the platter behind it.
  const out = 1.85;
  const x = Math.cos(ARM_REST) * out;
  const z = -Math.sin(ARM_REST) * out;
  // Top of the cradle meets the underside of the tube.
  const height = ARM_PIVOT_Y - 0.055;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.07, height, 20]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>
      <mesh position={[0, height + 0.02, 0]} castShadow>
        <boxGeometry args={[0.1, 0.05, 0.11]} />
        <meshStandardMaterial {...PLASTIC} roughness={0.45} />
      </mesh>
    </group>
  );
}

/** Cueing platform beside the pivot, with its chrome lever. */
function CueLever() {
  return (
    <group position={[0.24, 0, 0.33]}>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.18, 24]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>
      <mesh
        position={[0.09, 0.19, 0]}
        rotation={[0, 0, Math.PI / 2 - 0.35]}
        castShadow
      >
        <cylinderGeometry args={[0.016, 0.016, 0.2, 16]} />
        <meshStandardMaterial {...CHROME} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* controls                                                                    */
/* -------------------------------------------------------------------------- */

function Controls({ rpm }: { rpm: number }) {
  return (
    <>
      {[-0.35, 0.25].map((z) => (
        <Knob key={z} z={z} />
      ))}
      <PitchFader rpm={rpm} />
    </>
  );
}

/** Knurled metal knob with a brass collar, sunk into the plate. */
function Knob({ z }: { z: number }) {
  return (
    <group position={[-1.75, PLATE_TOP, z]}>
      <mesh position={[0, 0.008, 0]} receiveShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.016, 32]} />
        <meshStandardMaterial
          color="#b08d4f"
          roughness={0.3}
          metalness={0.95}
        />
      </mesh>
      <mesh position={[0, 0.075, 0]} castShadow>
        {/* Low segment count on purpose: the facets read as knurling. */}
        <cylinderGeometry args={[0.13, 0.14, 0.12, 20]} />
        <meshStandardMaterial
          color="#3a3a3f"
          roughness={0.38}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[0, 0.137, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.012, 20]} />
        <meshStandardMaterial
          color="#9aa0a6"
          roughness={0.28}
          metalness={0.9}
        />
      </mesh>
      {/* index mark, so the knob has an orientation to read */}
      <mesh position={[0.07, 0.145, 0]}>
        <boxGeometry args={[0.1, 0.006, 0.016]} />
        <meshStandardMaterial color="#17171a" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Pitch slider on the front right, its nub tracking the current rpm. */
function PitchFader({ rpm }: { rpm: number }) {
  const travel = THREE.MathUtils.mapLinear(
    THREE.MathUtils.clamp(rpm, 33, 45),
    33,
    45,
    -0.28,
    0.28,
  );

  return (
    <group position={[1.55, PLATE_TOP, 1.25]}>
      {/* recessed well */}
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <boxGeometry args={[0.94, 0.024, 0.3]} />
        <meshStandardMaterial color="#c9c4ae" roughness={0.65} />
      </mesh>
      {/* slot the nub rides in */}
      <mesh position={[0, 0.026, 0]} receiveShadow>
        <boxGeometry args={[0.76, 0.012, 0.07]} />
        <meshStandardMaterial color="#3c3c40" roughness={0.7} />
      </mesh>
      <mesh position={[travel, 0.062, 0]} castShadow>
        <boxGeometry args={[0.14, 0.085, 0.2]} />
        <meshStandardMaterial
          color="#8d8d92"
          roughness={0.35}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[travel, 0.106, 0]}>
        <boxGeometry args={[0.02, 0.006, 0.2]} />
        <meshStandardMaterial color="#e8e8ea" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** The two hinges a dust cover would drop onto, at the back of the plate. */
function DustCoverHinges() {
  const z = -PLINTH.d / 2 + 0.16;
  return (
    <>
      {[-1.45, 1.45].map((x) => (
        <group key={x} position={[x, PLATE_TOP, z]}>
          {/* Footplate, so the hinge is bolted down rather than sat on top. */}
          <mesh position={[0, 0.015, 0]} receiveShadow>
            <boxGeometry args={[0.3, 0.03, 0.2]} />
            <meshStandardMaterial color="#141417" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.07, 0.01]} castShadow>
            <boxGeometry args={[0.2, 0.11, 0.13]} />
            <meshStandardMaterial color="#1b1b1f" roughness={0.5} />
          </mesh>
          {/* The barrel the cover would pivot on. */}
          <mesh
            position={[0, 0.11, -0.04]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.026, 0.026, 0.24, 16]} />
            <meshStandardMaterial {...CHROME} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */

/** Loads album art into a texture, swapping it as the selected track changes. */
function useArtwork(url?: string) {
  const [loaded, setLoaded] = useState<{
    url: string;
    texture: THREE.Texture;
  } | null>(null);

  useEffect(() => {
    if (!url) return;

    let stale = false;
    let mine: THREE.Texture | null = null;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      if (stale) {
        texture.dispose();
        return;
      }
      mine = texture;
      setLoaded({ url, texture });
    });

    return () => {
      stale = true;
      // Disposed from here rather than off the state, so clearing the track
      // frees the texture as well as swapping to a different one does.
      mine?.dispose();
    };
  }, [url]);

  // Read back against the current url instead of being cleared in the effect:
  // the previous cover must not sit on the record for even one frame after the
  // track changes.
  // Not optional chaining: with no url at all, `undefined === undefined`
  // would match and hand back a texture that is not there.
  return loaded !== null && loaded.url === url ? loaded.texture : null;
}
