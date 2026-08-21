import * as THREE from "three";

/**
 * Canvas-drawn maps rather than image files: a record is concentric rings, so
 * it is cheaper and sharper to draw them at load than to ship and downsample a
 * texture. Both maps are generated once and shared by every record.
 */

const SIZE = 1024;

function makeCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  return canvas;
}

/**
 * Grooves as a roughness map. Light rings are rougher and scatter, dark rings
 * stay glossy, so the disc catches the key light in bands the way vinyl does
 * instead of reading as a flat black circle.
 */
export function grooveRoughnessMap() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");

  const mid = SIZE / 2;
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Grooves live in the playable band only; the label and the run-out are flat.
  const outer = mid * 0.98;
  const inner = mid * 0.36;

  for (let r = inner; r < outer; r += 2.4) {
    const shade = 90 + Math.sin(r * 0.7) * 18;
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(mid, mid, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

/**
 * The same rings as a normal map, so the grooves also catch light at grazing
 * angles when the camera orbits low across the disc.
 */
export function grooveNormalMap() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");

  const mid = SIZE / 2;
  // Flat normal: pointing straight out of the surface.
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const outer = mid * 0.98;
  const inner = mid * 0.36;

  for (let r = inner; r < outer; r += 2.4) {
    // Alternating tilt across each groove wall, red channel only, which is the
    // axis that runs across the rings.
    ctx.strokeStyle = "rgba(150,128,255,0.85)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(mid, mid, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(106,128,255,0.85)";
    ctx.beginPath();
    ctx.arc(mid, mid, r + 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}
