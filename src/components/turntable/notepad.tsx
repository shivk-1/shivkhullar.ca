"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Text, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A spiral pad and a pen lying on the floor to the right of the deck, in the
 * table lamp's pool of light, with the current track's note written on the
 * page.
 *
 * "Notebook" by hitheredearjohn and "Pen" by cebraVFX on sketchfab, both CC
 * Attribution.
 *
 * The writing is troika text sitting a hair above the top page rather than a
 * texture painted into the paper's material, for two reasons. The pad's uv
 * layout is not built for it — the cover and the pages share one unwrapped
 * island — and, more importantly, a texture swap is a load. Everything in the
 * room is inside one Suspense boundary with a null fallback, so anything that
 * suspends mid-song would drop the whole scene to nothing and cut it back in,
 * which is exactly what the fade exists to avoid. drei's Text suspends on
 * ['troika-text', font, characters] and nothing else, so the font resolves
 * once while the room is still coming up and the message after that is a
 * plain prop change on one mesh.
 */

const PAD = "/models/notebook.glb";
const PEN = "/models/pen.glb";

/**
 * Hand lettering, so the page reads as written rather than typeset.
 *
 * It ships 70 glyphs: the two alphabets and `. , ! ? ' " : ;`. No digits, no
 * hyphen, no brackets. Troika draws a glyph the font does not have as nothing,
 * so anything outside that set leaves a hole in the sentence — which is why
 * `Track.message` says to write the notes in words.
 */
const FONT = "/fonts/CutiePieBold-Regular.ttf";

/**
 * Where the pad lies: out past the deck's right edge, which is at x 2.3, and
 * two units in front of the table lamp at (3.15, -2.3) so it sits inside the
 * light rather than beside it.
 */
const PAD_AT = { x: 3.55, z: 0.05 };

/**
 * Square to the room on purpose. Angling the pad would angle the writing with
 * it, and the message is already fighting for legibility lying flat — the pen
 * beside it carries the casualness instead.
 *
 * Negative a quarter turn puts the file's spiral edge, which runs up its own
 * -x, along the room's back edge: a pad bound at the top, seen from the front.
 */
const PAD_HEADING = -Math.PI / 2;

/** Front to back, the pad's long axis. About a5 against a 4.6 wide deck. */
const PAD_LENGTH = 2.18;

/**
 * The file, measured. `length` is its x extent including the spiral, `centre`
 * the middle of its footprint, and `floor` how far the spiral dips below the
 * origin — all three in the file's own units.
 */
const PAD_MODEL = {
  length: 2.6138,
  centre: { x: -0.0535, z: 0.0007 },
  floor: -0.0889,
  /**
   * The flat top of the cover: the only face here big enough and level enough
   * to write on. Taken from the vertices rather than the bounding box, which
   * includes the edges rolling off it and the spiral standing proud.
   */
  page: { y: 0.1767, x: [-1.0066, 1.007], z: [-1.0144, 0.9992] },
} as const;

/**
 * Beside the pad, with a hand's width between them. Held in from where it
 * would naturally sit: the frame's right edge lands near x 5 on a narrow
 * canvas, and a pen with its tip cropped off reads as a mistake.
 */
const PEN_AT = { x: 4.78, z: 0.12 };

/**
 * Along the pad's long axis, then turned in. A pen set down exactly parallel
 * to the pad it belongs to reads as placed; a few degrees off reads as put
 * down.
 */
const PEN_HEADING = Math.PI / 2 - 0.3;
const PEN_LENGTH = 1.42;
const PEN_MODEL = {
  length: 14.8149,
  centre: { x: -0.1327, z: 0.0848 },
  floor: -0.0331,
} as const;

/** How much of the flat top the writing may use, leaving a paper margin. */
const MARGIN = 0.84;

/**
 * How the lettering is sized to the note.
 *
 * `smallest` and `largest` are fractions of the writing box's own width, so
 * the proportions survive the pad being rescaled. `fill` is how much of the
 * box's height a note has to take up before it counts as fitted — below that
 * the lettering grows. `passes` is the ceiling on measurements per note, so a
 * string that cannot settle gives up rather than measuring forever.
 */
const FIT = {
  smallest: 0.035,
  largest: 0.14,
  fill: 0.86,
  passes: 8,
} as const;

/** Ink. Dark and warm rather than black, so the lamp still finds it. */
const INK = "#2b2119";

/**
 * How fast the writing changes over. Fast enough to read as a page being
 * swapped, slow enough not to be a cut.
 */
const FADE = 12;

/**
 * Clones a loaded scene and fixes up what gltf does not carry.
 *
 * Shadow flags are never in the file. Materials are cloned before they are
 * touched because useGLTF hands back one cached scene per url and the clone
 * shares its materials — editing them in place would edit them for anyone
 * else who loads the same model, and would stack on every hot reload.
 */
function prepare(
  source: THREE.Object3D,
  paint?: (material: THREE.MeshStandardMaterial, mesh: THREE.Mesh) => void,
) {
  const root = source.clone(true);
  const owned: THREE.Material[] = [];

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (!paint) return;
    const material = mesh.material;
    if (Array.isArray(material) || !(material as THREE.Material).isMaterial) {
      return;
    }

    const copy = (material as THREE.MeshStandardMaterial).clone();
    paint(copy, mesh);
    mesh.material = copy;
    owned.push(copy);
  });

  return { root, owned };
}

export function Notepad({ message }: { message?: string }) {
  const pad = useGLTF(PAD);
  const pen = useGLTF(PEN);

  const built = useMemo(() => {
    const padScale = PAD_LENGTH / PAD_MODEL.length;
    const penScale = PEN_LENGTH / PEN_MODEL.length;

    /**
     * The box the writing has to live inside, in the pad group's own axes.
     * `width` runs along the reading direction, which is the file's z and the
     * room's x once the group's quarter turn is applied; `height` is the way
     * the lines stack, the file's x.
     */
    const box = {
      width: (PAD_MODEL.page.z[1] - PAD_MODEL.page.z[0]) * padScale * MARGIN,
      height: (PAD_MODEL.page.x[1] - PAD_MODEL.page.x[0]) * padScale * MARGIN,
    };

    const paper = prepare(pad.scene, (material, mesh) => {
      // The spiral ships with no metallicFactor at all, which in gltf means
      // fully metallic. Chrome wire with nothing around it to reflect renders
      // as a black stripe down the edge of the pad, so it is pulled back to a
      // dull steel that the lamps can actually catch.
      if (material.name === "Material") {
        material.metalness = 0.55;
        material.roughness = 0.42;
        material.color.set("#9aa0a4");
        return;
      }
      // Paper. The file's grey is a shade too dark to read as a fresh page
      // under a warm lamp, and the ink needs something to sit against.
      if (mesh.name === "Object_4" || mesh.name === "Object_5") {
        material.color.set("#d9d2c4");
        material.roughness = 0.85;
      }
    });

    const barrel = prepare(pen.scene, (material) => {
      // Both of this file's materials are pure black with metalness 0 —
      // including the one called "Chrome". Left alone the pen is a silhouette
      // in a room this dark, so the fittings are made actually metal and the
      // body is lifted off black far enough to take a highlight.
      if (material.name === "Chrome") {
        material.color.set("#c8ccd2");
        material.metalness = 0.9;
        material.roughness = 0.28;
        return;
      }
      material.color.set("#1c1b21");
      material.metalness = 0.15;
      material.roughness = 0.38;
    });

    return {
      paper,
      barrel,
      padScale,
      penScale,
      padOffset: [
        -PAD_MODEL.centre.x * padScale,
        -PAD_MODEL.floor * padScale,
        -PAD_MODEL.centre.z * padScale,
      ] as const,
      penOffset: [
        -PEN_MODEL.centre.x * penScale,
        -PEN_MODEL.floor * penScale,
        -PEN_MODEL.centre.z * penScale,
      ] as const,
      /**
       * Where the writing goes, in the pad group's own space: the middle of
       * the flat top, lifted off it by a hair.
       *
       * The pad is not rotated inside its group — the group is — so this is
       * still the file's own axes here. The page's long side runs along z,
       * which after the group's quarter turn is the room's x, so that is the
       * direction the lines end up reading in.
       */
      page: {
        x:
          ((PAD_MODEL.page.x[0] + PAD_MODEL.page.x[1]) / 2 -
            PAD_MODEL.centre.x) *
          padScale,
        y: PAD_MODEL.page.y * padScale - PAD_MODEL.floor * padScale + 0.004,
        z:
          ((PAD_MODEL.page.z[0] + PAD_MODEL.page.z[1]) / 2 -
            PAD_MODEL.centre.z) *
          padScale,
        ...box,
        smallest: box.width * FIT.smallest,
        largest: box.width * FIT.largest,
      },
    };
  }, [pad.scene, pen.scene]);

  useEffect(() => {
    const materials = [...built.paper.owned, ...built.barrel.owned];
    return () => {
      for (const material of materials) material.dispose();
    };
  }, [built]);

  return (
    <>
      <group position={[PAD_AT.x, 0, PAD_AT.z]} rotation={[0, PAD_HEADING, 0]}>
        <primitive
          object={built.paper.root}
          scale={built.padScale}
          position={built.padOffset}
        />
        <Message message={message} at={built.page} />
      </group>

      <group position={[PEN_AT.x, 0, PEN_AT.z]} rotation={[0, PEN_HEADING, 0]}>
        <primitive
          object={built.barrel.root}
          scale={built.penScale}
          position={built.penOffset}
        />
      </group>
    </>
  );
}

/**
 * The note on the page: the crossfade from one note to the next, and the fit
 * of a note of any length into the box on the paper.
 *
 * `message` is what should be on the page and `shown` is what is on it. They
 * differ only while the old note is fading out, and the swap happens at the
 * bottom of that fade, so the words are never seen changing.
 *
 * The size is measured rather than calculated. Troika lays text out in a
 * worker against the font's own advances, so how many lines a note wraps to,
 * and how tall it therefore stands, is not something that can be worked out
 * from its length up front — the only honest way to know is to set it and look.
 * So each note is laid out, its block bounds are read back on sync, and the
 * lettering steps toward a size that fills the box.
 *
 * Each step moves by the square root of how far off it is because height goes
 * roughly as the square of the lettering: a bigger face makes every line
 * taller and forces more of them at once. Stepping by the ratio itself
 * overshoots and oscillates; stepping by its root lands inside the tolerance
 * in two or three passes.
 *
 * None of that is ever seen. The note is pinned at zero opacity until its fit
 * has settled, so it fades in already the right size instead of resizing in
 * front of the reader.
 */
function Message({
  message,
  at,
}: {
  message?: string;
  at: {
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    smallest: number;
    largest: number;
  };
}) {
  const [shown, setShown] = useState(message);
  const [size, setSize] = useState(at.largest);
  const passes = useRef(0);
  const fitted = useRef(false);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const opacity = useRef(0);

  /**
   * Called by troika every time it finishes laying the note out, which is
   * once per render of this component. Sets state only while the fit is still
   * moving, so the renders it causes stop rather than feeding themselves.
   */
  const measure = (troika: { textRenderInfo?: { blockBounds: number[] } }) => {
    const bounds = troika.textRenderInfo?.blockBounds;
    const height = bounds ? bounds[3] - bounds[1] : 0;

    // Nothing to fit: an empty page is already the right size.
    if (!shown || height <= 0) {
      fitted.current = true;
      return;
    }

    const ratio = at.height / height;
    // Inside the box, and filling enough of it to look written rather than
    // typed onto one line in the middle.
    const settled = ratio >= 1 && ratio <= 1 / FIT.fill;
    if (settled || passes.current >= FIT.passes) {
      fitted.current = true;
      return;
    }

    const next = THREE.MathUtils.clamp(
      size * Math.sqrt(ratio),
      at.smallest,
      at.largest,
    );

    // Already pinned against one end of the range: no further pass can move
    // it, and waiting for one that never comes would hold the page blank.
    if (Math.abs(next - size) < 1e-4) {
      fitted.current = true;
      return;
    }

    passes.current += 1;
    setSize(next);
  };

  useFrame((_, delta) => {
    // Held down while the page is out of date, while the fit is still being
    // found, and while there is nothing to say at all — an empty pad is
    // better than a stand-in line.
    const target = shown !== message || !shown || !fitted.current ? 0 : 1;
    opacity.current = THREE.MathUtils.damp(
      opacity.current,
      target,
      FADE,
      delta,
    );

    if (shown !== message && opacity.current < 0.02) {
      setShown(message);
      // A new note is a new fit, restarted from the largest the page allows.
      // Coming down from too big converges from the side a short note can
      // simply stay on. Done here rather than in an effect so the reset sits
      // in the one place the note actually changes.
      passes.current = 0;
      fitted.current = false;
      setSize(at.largest);
    }
    if (material.current) material.current.opacity = opacity.current;
  });

  return (
    <Text
      // Laid onto the page and turned so the lines read across the room
      // rather than up and down it: with the group's quarter turn, the text's
      // own reading direction ends up along the room's x.
      rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      position={[at.x, at.y, at.z]}
      font={FONT}
      fontSize={size}
      maxWidth={at.width}
      lineHeight={1.3}
      // A single word longer than the page would otherwise run off both edges
      // of the paper, and no amount of shrinking fixes it — troika only wraps
      // at spaces unless it is told it may break inside a word.
      overflowWrap="break-word"
      onSync={measure}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      // Pulls the glyphs toward the camera in the depth buffer, so they never
      // z-fight the cover they are lying on.
      depthOffset={-1}
    >
      {shown ?? ""}
      <meshStandardMaterial
        ref={material}
        color={INK}
        roughness={0.9}
        transparent
        opacity={0}
        // Ink soaks into paper rather than sitting on top of it, so it should
        // not be lit as a separate surface catching its own highlight.
        metalness={0}
      />
    </Text>
  );
}

useGLTF.preload(PAD);
useGLTF.preload(PEN);
