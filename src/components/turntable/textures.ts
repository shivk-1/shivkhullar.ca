import * as THREE from "three";

/**
 * Every map on the deck is drawn to a canvas at mount rather than shipped as an
 * image. A record is concentric rings and a plinth is grain lines, so both are
 * cheaper and sharper to generate than to download and downsample, and nothing
 * here adds a byte to the bundle.
 *
 * Maps are built once per mount and disposed by the component that made them.
 */

const TAU = Math.PI * 2;

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d canvas unavailable");
  return ctx;
}

function texture(canvas: HTMLCanvasElement, srgb = false) {
  const map = new THREE.CanvasTexture(canvas);
  map.anisotropy = 16;
  // Colour maps are authored in srgb; roughness and normal data are not and
  // must stay linear or the values get gamma-mangled on the way to the shader.
  map.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return map;
}

/** Deterministic hash in [0,1). Keeps the grain and grooves from looking milled. */
function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/* -------------------------------------------------------------------------- */
/* vinyl                                                                       */
/* -------------------------------------------------------------------------- */

const VINYL_SIZE = 2048;

/**
 * Radial layout of a 12", as fractions of the disc radius. A cylinder's cap uv
 * is a circle of radius 0.5 centred in the square, so these fractions land on
 * the canvas exactly where they land on the record.
 */
const RIM = 0.965; // outer land, above the lead-in: glossy and groove-free
const LEAD_IN = 0.935; // wide spiral the stylus drops into
const PLAY_IN = 0.4; // inner end of the modulated band
const RUN_OUT = 0.345; // start of the label

/** Radii where one track ends and the next begins: a wider, brighter land. */
const TRACK_BANDS = [0.9, 0.81, 0.71, 0.63, 0.55, 0.47];
const BAND_HALF_WIDTH = 0.0045;

type Band =
  | { grooved: true; pitch: number; amp: number }
  /** A smooth land. The separation between tracks is the brighter kind. */
  | { grooved: false; separator: boolean };

const LAND: Band = { grooved: false, separator: false };
const SEPARATOR: Band = { grooved: false, separator: true };

/** Groove pitch and depth at a given radius, in canvas pixels. */
function bandAt(t: number): Band {
  if (t > 1 || t < RUN_OUT) return LAND;
  if (t > RIM) return LAND;
  if (t > LEAD_IN) return { grooved: true, pitch: 10, amp: 0.24 };
  if (t < PLAY_IN) return { grooved: true, pitch: 9, amp: 0.24 };
  for (const band of TRACK_BANDS) {
    if (Math.abs(t - band) < BAND_HALF_WIDTH) return SEPARATOR;
  }
  return { grooved: true, pitch: 3.6, amp: 0.42 };
}

/**
 * One radial profile shared by both vinyl maps.
 *
 * The pattern is radially symmetric, so the expensive part (groove phase, its
 * slope, the normalisation) is solved once per radius into a lookup table and
 * the per-pixel loop is left with a single sqrt. At 2048px that is the
 * difference between a visible hitch on mount and none.
 */
const LUT_STEPS = 4; // samples per pixel of radius
function vinylProfile(mid: number) {
  const n = Math.ceil(mid * LUT_STEPS) + 2;
  const nxy = new Float32Array(n); // normal component along the radius
  const nz = new Float32Array(n);
  const rough = new Float32Array(n);
  const shade = new Uint8Array(n); // albedo, 0-255

  for (let i = 0; i < n; i++) {
    const dist = i / LUT_STEPS;
    const t = dist / mid;
    const band = bandAt(t);

    if (!band.grooved) {
      nxy[i] = 0;
      nz[i] = 1;
      // Label is paper, everything else here is polished land.
      rough[i] = t < RUN_OUT ? 0.82 : 0.1;
      // Separators are the bright rings you actually read a record by: they
      // are where one track ends, and they catch light the grooves scatter.
      shade[i] = band.separator ? 30 : 20;
      continue;
    }

    const phase = dist / band.pitch;
    const groove = Math.floor(phase);
    const f = phase - groove;

    // Height runs land -> valley -> land across one pitch, so the slope is a
    // sine. Amplitude jitters per groove: a record is pressed, not machined.
    const depth = band.amp * (0.72 + 0.56 * hash(groove));
    const slope = depth * Math.sin(f * TAU);

    const len = Math.hypot(slope, 1);
    nxy[i] = -slope / len;
    nz[i] = 1 / len;

    // Valleys scatter, lands stay glossy: this is what makes the disc read as
    // banded vinyl instead of a flat black circle.
    const valley = 0.5 - 0.5 * Math.cos(f * TAU);
    rough[i] = 0.11 + 0.55 * valley;
    // Relief alone only shows the grooves when the light happens to rake them.
    // Baking the same profile into the albedo keeps them readable head on.
    shade[i] = 6 + (1 - valley) * 13;
  }

  return { nxy, nz, rough, shade, n };
}

export type VinylMaps = {
  map: THREE.Texture;
  roughness: THREE.Texture;
  normal: THREE.Texture;
};

export function vinylMaps(): VinylMaps {
  const size = VINYL_SIZE;
  const mid = size / 2;
  const profile = vinylProfile(mid);

  const roughCanvas = makeCanvas(size);
  const normalCanvas = makeCanvas(size);
  const colourCanvas = makeCanvas(size);
  const roughCtx = context(roughCanvas);
  const normalCtx = context(normalCanvas);
  const colourCtx = context(colourCanvas);

  const roughData = roughCtx.createImageData(size, size);
  const normalData = normalCtx.createImageData(size, size);
  const colourData = colourCtx.createImageData(size, size);
  const rough = roughData.data;
  const normal = normalData.data;
  const colour = colourData.data;

  for (let y = 0; y < size; y++) {
    const dy = y + 0.5 - mid;
    const dy2 = dy * dy;
    let i = y * size * 4;

    for (let x = 0; x < size; x++, i += 4) {
      const dx = x + 0.5 - mid;
      const dist = Math.sqrt(dx * dx + dy2);

      const step = Math.min(profile.n - 1, (dist * LUT_STEPS) | 0);
      const invDist = dist > 0.0001 ? 1 / dist : 0;
      const radial = profile.nxy[step];

      const nx = radial * dx * invDist;
      const ny = radial * dy * invDist;

      normal[i] = (nx * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny * 0.5 + 0.5) * 255;
      normal[i + 2] = (profile.nz[step] * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;

      // A little per-pixel grain on top of the radial profile, small enough
      // that mipmaps blur it into a pressing texture rather than noise.
      const speck = (hash(x * 0.731 + y * 1.117) - 0.5) * 0.05;
      const value = Math.max(0, Math.min(1, profile.rough[step] + speck)) * 255;
      rough[i] = value;
      rough[i + 1] = value;
      rough[i + 2] = value;
      rough[i + 3] = 255;

      const tone = profile.shade[step];
      colour[i] = tone;
      colour[i + 1] = tone;
      // A hair of blue in the black, the way a pressing actually reads.
      colour[i + 2] = tone + 2;
      colour[i + 3] = 255;
    }
  }

  roughCtx.putImageData(roughData, 0, 0);
  normalCtx.putImageData(normalData, 0, 0);
  colourCtx.putImageData(colourData, 0, 0);

  return {
    map: texture(colourCanvas, true),
    roughness: texture(roughCanvas),
    normal: texture(normalCanvas),
  };
}

/* -------------------------------------------------------------------------- */
/* shared derivations                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Reads a drawn canvas as a height field and turns its luminance gradient into
 * a tangent-space normal map, so one drawing gives both the look and the relief.
 */
function normalFromLuminance(source: HTMLCanvasElement, strength: number) {
  const size = source.width;
  const pixels = context(source).getImageData(0, 0, size, size).data;

  const height = new Float32Array(size * size);
  for (let i = 0, p = 0; i < height.length; i++, p += 4) {
    height[i] =
      (pixels[p] * 0.299 + pixels[p + 1] * 0.587 + pixels[p + 2] * 0.114) / 255;
  }

  const out = makeCanvas(size);
  const ctx = context(out);
  const image = ctx.createImageData(size, size);
  const data = image.data;

  const at = (x: number, y: number) =>
    height[(y & (size - 1)) * size + (x & (size - 1))];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = (-dx / len) * 0.5 * 255 + 127.5;
      data[i + 1] = (-dy / len) * 0.5 * 255 + 127.5;
      data[i + 2] = (1 / len) * 0.5 * 255 + 127.5;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return out;
}

/** Remaps a canvas's luminance onto a roughness range: dark pixels rougher. */
function roughnessFromLuminance(
  source: HTMLCanvasElement,
  low: number,
  high: number,
) {
  const size = source.width;
  const ctx = context(source);
  const image = ctx.getImageData(0, 0, size, size);
  const pixels = image.data;

  const out = makeCanvas(size);
  const outCtx = context(out);
  const target = outCtx.createImageData(size, size);
  const data = target.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const lum =
      (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) / 255;
    const value = (high + (low - high) * lum) * 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  outCtx.putImageData(target, 0, 0);
  return out;
}

/* -------------------------------------------------------------------------- */
/* wood                                                                        */
/* -------------------------------------------------------------------------- */

const WOOD_SIZE = 1024;

export type SurfaceMaps = {
  map?: THREE.Texture;
  roughness: THREE.Texture;
  normal: THREE.Texture;
};

/**
 * Light oak: a warm base, long grain lines running along x with a slow warp, a
 * couple of cathedral figures, and open pores scattered over the top.
 */
export function woodMaps(): SurfaceMaps {
  const size = WOOD_SIZE;
  const canvas = makeCanvas(size);
  const ctx = context(canvas);

  const base = ctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, "#b8874d");
  base.addColorStop(0.45, "#a9773c");
  base.addColorStop(1, "#b48449");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Cathedral figure: nested arcs, the flat-sawn look of a board face.
  for (let f = 0; f < 3; f++) {
    const centre = size * (0.2 + 0.3 * f) + hash(f * 7.3) * 60;
    for (let ring = 0; ring < 26; ring++) {
      const spread = 14 + ring * 11;
      ctx.strokeStyle = `rgba(96,62,32,${0.07 + hash(f * 31 + ring) * 0.08})`;
      ctx.lineWidth = 1.4 + hash(ring * 3.1) * 1.6;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 8) {
        const u = (x - size * 0.5) / (size * 0.5);
        const y = centre + spread * (1 - Math.exp(-u * u * 3.2));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Straight grain over the top, warped just enough to avoid reading as stripes.
  for (let line = 0; line < 320; line++) {
    const y0 = hash(line * 1.37) * size;
    const dark = hash(line * 5.11);
    ctx.strokeStyle = `rgba(${74 + dark * 56},${48 + dark * 42},${26 + dark * 28},${0.18 + dark * 0.34})`;
    ctx.lineWidth = 0.9 + hash(line * 9.7) * 3.4;
    ctx.beginPath();
    const wobble = 3 + hash(line * 2.9) * 9;
    // Whole cycles only, so the line meets itself across a tile seam.
    const freq = Math.round(1 + hash(line * 4.4) * 2) * TAU;
    for (let x = 0; x <= size; x += 6) {
      const y = y0 + Math.sin((x / size) * freq + line) * wobble;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Open pores: the short dark ticks that make oak read as oak up close.
  ctx.lineCap = "round";
  for (let pore = 0; pore < 2600; pore++) {
    const x = hash(pore * 1.91) * size;
    const y = hash(pore * 3.77) * size;
    const length = 2 + hash(pore * 6.13) * 9;
    ctx.strokeStyle = `rgba(58,36,18,${0.18 + hash(pore * 8.3) * 0.26})`;
    ctx.lineWidth = 0.7 + hash(pore * 2.21) * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + (hash(pore * 4.9) - 0.5) * 1.6);
    ctx.stroke();
  }

  const map = texture(canvas, true);
  const roughness = texture(roughnessFromLuminance(canvas, 0.52, 0.78));
  const normal = texture(normalFromLuminance(canvas, 5));

  // The visible plinth faces are long and shallow, so only a strip of the
  // texture is used and it is scaled to match: enough of the board to show a
  // dozen grain lines and one cathedral figure, at the same pixels-per-unit in
  // both axes. Packing the whole texture in would mip the grain away to a tan.
  for (const t of [map, roughness, normal]) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.45, 0.05);
    t.offset.set(0.25, 0.16);
  }

  return { map, roughness, normal };
}

/* -------------------------------------------------------------------------- */
/* brushed aluminium                                                           */
/* -------------------------------------------------------------------------- */

const METAL_SIZE = 1024;

/**
 * Circular brushing for the platter: fine concentric scratches, far shallower
 * and far more irregular than a groove, so the platter catches a smeared
 * highlight instead of a mirror one.
 */
export function brushedMaps(): SurfaceMaps {
  const size = METAL_SIZE;
  const mid = size / 2;

  const canvas = makeCanvas(size);
  const ctx = context(canvas);
  const image = ctx.createImageData(size, size);
  const data = image.data;

  // Same radial-symmetry trick as the vinyl: solve per radius, look up per pixel.
  const steps = size * 2;
  const level = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const r = i / 2;
    level[i] =
      0.5 +
      (hash(r * 0.9) - 0.5) * 0.55 +
      (hash(r * 4.7) - 0.5) * 0.25 +
      Math.sin(r * 0.31) * 0.05;
  }

  for (let y = 0; y < size; y++) {
    const dy = y + 0.5 - mid;
    const dy2 = dy * dy;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - mid;
      const dist = Math.sqrt(dx * dx + dy2);
      // Break the perfect rings so the brushing reads as scratches, not rings.
      const angle = Math.atan2(dy, dx);
      const jitter =
        (hash(Math.floor(angle * 9) * 1.7 + Math.floor(dist)) - 0.5) * 3;
      const value =
        Math.max(
          0,
          Math.min(1, level[Math.min(steps - 1, ((dist + jitter) * 2) | 0)]),
        ) * 255;
      const i = (y * size + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  return {
    roughness: texture(roughnessFromLuminance(canvas, 0.18, 0.42)),
    normal: texture(normalFromLuminance(canvas, 1.6)),
  };
}

/* -------------------------------------------------------------------------- */
/* felt                                                                        */
/* -------------------------------------------------------------------------- */

/** Slipmat: matte, fibrous, no specular to speak of. Roughness and relief only. */
export function feltMaps(): SurfaceMaps {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = context(canvas);

  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(0, 0, size, size);

  ctx.lineCap = "round";
  for (let fibre = 0; fibre < 9000; fibre++) {
    const x = hash(fibre * 1.13) * size;
    const y = hash(fibre * 2.71) * size;
    const angle = hash(fibre * 5.33) * TAU;
    const length = 2 + hash(fibre * 7.9) * 5;
    const shade = 96 + hash(fibre * 3.19) * 96;
    ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.5)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }

  return {
    roughness: texture(roughnessFromLuminance(canvas, 0.82, 0.98)),
    normal: texture(normalFromLuminance(canvas, 2.2)),
  };
}

/* -------------------------------------------------------------------------- */
/* ground shadow                                                               */
/* -------------------------------------------------------------------------- */

const GROUND_SIZE = 512;

/** How dark the pool is where the slab meets the floor. */
const GROUND_CORE = 0.44;
/** World distance over which it fades out from the slab's edge. */
const GROUND_FALLOFF = 0.62;

/**
 * The pool the deck sits in.
 *
 * Painted rather than rendered. The plinth is a slab sitting flush on the
 * floor, so a real contact shadow is hidden underneath it and the cast one is
 * a sliver at the base — correct, and invisible. A product shot solves this
 * with a soft pool wider than the object, which is what this draws: the
 * signed distance out from the plinth footprint, faded off.
 *
 * `w` and `d` are the footprint and `spread` the world size of the plane the
 * map goes on, all in the same units.
 */
export function groundShadowMap(w: number, d: number, spread: number) {
  const canvas = makeCanvas(GROUND_SIZE);
  const ctx = context(canvas);
  const image = ctx.createImageData(GROUND_SIZE, GROUND_SIZE);
  const data = image.data;

  const halfW = w / 2;
  const halfD = d / 2;
  // Nudged the way the key light throws it, so the painted pool and the real
  // cast shadow agree rather than fighting.
  const offsetX = -0.1;
  const offsetZ = -0.1;

  for (let row = 0; row < GROUND_SIZE; row++) {
    // The plane is rotated flat, so a canvas row is a line of constant z.
    const z = (row / GROUND_SIZE - 0.5) * spread - offsetZ;
    for (let col = 0; col < GROUND_SIZE; col++) {
      const x = (col / GROUND_SIZE - 0.5) * spread - offsetX;

      // Signed distance to the footprint: zero inside it, and the real
      // distance out once past an edge or a corner.
      const qx = Math.abs(x) - halfW;
      const qz = Math.abs(z) - halfD;
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
      const distance = outside + Math.min(Math.max(qx, qz), 0);

      const alpha =
        distance <= 0
          ? GROUND_CORE
          : GROUND_CORE * Math.exp(-Math.pow(distance / GROUND_FALLOFF, 1.35));

      const i = (row * GROUND_SIZE + col) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = alpha * 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return texture(canvas);
}
