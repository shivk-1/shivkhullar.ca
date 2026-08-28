"use client";

import { useEffect, useRef } from "react";
import { usePointerDecoration } from "@/lib/use-media-query";

/**
 * A halftone dot trail that follows the pointer, inverting what it crosses.
 *
 * Two webgl passes. The first keeps a low resolution scalar field in a
 * ping-ponged framebuffer: last frame's field is multiplied by a decay and a
 * gaussian blob is added at the pointer, stretched along the direction of
 * travel in proportion to speed, so a fast hand leaves a streak and a slow one
 * leaves a circle. The second reads that field per halftone cell and draws a
 * dot whose radius is the density there, which is what turns a smooth field
 * into print-style dots.
 *
 * The engine came over close to unchanged. What did change is everything about
 * how it is mounted: the original is `absolute inset-0` with `zIndex: 0`, meant
 * to sit inside one `relative` card, and it wants a container rect on every
 * pointer event.
 */

const VERT_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const TRAIL_FRAG = `
  precision mediump float;
  uniform sampler2D uPrevTrail;
  uniform vec2 uMouse;
  uniform vec2 uMouseDir;
  uniform float uVelocity;
  uniform float uDecay;
  uniform float uBrushSize;
  uniform float uAspect;
  uniform float uReveal;
  varying vec2 vUv;

  void main() {
    float prev = texture2D(uPrevTrail, vUv).r * uDecay;
    vec2 delta = vUv - uMouse;
    delta.x *= uAspect;

    vec2 dir = length(uMouseDir) > 0.001 ? uMouseDir : vec2(0.0, 1.0);
    float along = dot(delta, dir);
    float perp = length(delta - along * dir);
    float elongation = 1.0 + uVelocity * 2.0;
    float blobDist = sqrt(along * along / elongation + perp * perp);

    float blob = exp(-blobDist * blobDist / (uBrushSize * uBrushSize)) * uReveal;
    gl_FragColor = vec4(min(prev + blob, 1.0), 0.0, 0.0, 1.0);
  }
`;

const HALFTONE_FRAG = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  uniform sampler2D uTrailTexture;
  uniform vec2 uResolution;
  uniform float uCellSize;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec2 pixel = vUv * uResolution;
    vec2 cellCoord = floor(pixel / uCellSize);
    vec2 cellCenter = (cellCoord + 0.5) * uCellSize;
    vec2 cellCenterUv = cellCenter / uResolution;

    float density = texture2D(uTrailTexture, cellCenterUv).r;
    float dist = length(fract(pixel / uCellSize) - 0.5);

    float radius = density * 0.47;
    float aa = fwidth(dist);
    float inDot = 1.0 - smoothstep(radius - aa, radius, dist);
    float alpha = inDot * smoothstep(0.05, 0.2, density);

    gl_FragColor = vec4(uColor, alpha * uOpacity);
  }
`;

/**
 * How often the thing under the pointer is looked up.
 *
 * elementFromPoint forces layout, and running it on every pointer event is
 * upwards of a hundred a second on a fast mouse. The reaction it feeds eases
 * over roughly two hundred milliseconds, so sampling this often is well inside
 * what anyone can see while costing a fraction as much.
 */
const HIT_MS = 60;

/** Side of the scalar field. Low on purpose; the halftone reads it per cell. */
const FIELD = 512;

/**
 * How long with no pointer movement before the loop stops.
 *
 * The field decays by a constant factor per frame, so it reaches nothing on its
 * own: at 0.965 it is under a 255th of its peak inside about 160 frames. Three
 * seconds is comfortably past that, and stopping matters because otherwise this
 * runs two webgl passes sixty times a second forever on a page someone is only
 * reading.
 */
const IDLE_MS = 3000;

interface EngineConfig {
  decay: number;
  brushSize: number;
  hoverBrushSize: number;
  opacity: number;
  hoverOpacity: number;
  speedScale: number;
  cellSize: number;
  hoverSelector: string;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function compileShader(
  gl: WebGLRenderingContext,
  source: string,
  type: number,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function linkProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram | null {
  const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function createFBO(gl: WebGLRenderingContext, size: number) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    size,
    size,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  return { fb, texture };
}

/**
 * Resolves a css colour, `var(--foreground)` included, to normalised rgb.
 *
 * The theme tokens here are oklch, which webgl knows nothing about. Setting the
 * colour on a live element lets getComputedStyle resolve the variable against
 * whichever theme is active, and painting that into a 1x1 canvas makes the
 * browser convert whatever colour space it hands back into plain sRGB bytes.
 */
const probe =
  typeof document !== "undefined"
    ? document
        .createElement("canvas")
        .getContext("2d", { willReadFrequently: true })
    : null;

function resolveColor(
  element: HTMLElement,
  color: string,
): [number, number, number] {
  element.style.color = color;
  const computed = getComputedStyle(element).color;
  if (!probe) return [0.5, 0.5, 0.5];
  probe.fillStyle = computed;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

class HalftoneTrailEngine {
  private gl: WebGLRenderingContext;
  private trailProgram: WebGLProgram;
  private halftoneProgram: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private fboA: { fb: WebGLFramebuffer | null; texture: WebGLTexture | null };
  private fboB: { fb: WebGLFramebuffer | null; texture: WebGLTexture | null };
  private rafId = 0;
  private config: EngineConfig;

  private tPrevLoc: WebGLUniformLocation | null;
  private tMouseLoc: WebGLUniformLocation | null;
  private tMouseDirLoc: WebGLUniformLocation | null;
  private tVelocityLoc: WebGLUniformLocation | null;
  private tDecayLoc: WebGLUniformLocation | null;
  private tBrushLoc: WebGLUniformLocation | null;
  private tAspectLoc: WebGLUniformLocation | null;
  private tRevealLoc: WebGLUniformLocation | null;
  private tPosLoc: number;

  private hTrailLoc: WebGLUniformLocation | null;
  private hResLoc: WebGLUniformLocation | null;
  private hCellLoc: WebGLUniformLocation | null;
  private hColorLoc: WebGLUniformLocation | null;
  private hOpacityLoc: WebGLUniformLocation | null;
  private hPosLoc: number;

  private width = 0;
  private height = 0;
  private mouseX = 0.5;
  private mouseY = 0.5;
  private dirX = 0;
  private dirY = 1;
  private velocity = 0;
  private hovering = false;
  private reveal = 0;
  private currentBrushSize: number;
  private currentOpacity: number;
  private colorRGB: [number, number, number] = [0.5, 0.5, 0.5];
  private lastActivity = 0;
  private lastHitAt = 0;

  constructor(canvas: HTMLCanvasElement, config: EngineConfig) {
    this.config = config;
    this.currentBrushSize = config.brushSize;
    this.currentOpacity = config.opacity;

    // premultipliedAlpha false matches the shader's straight alpha output.
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("webgl unavailable");
    this.gl = gl;

    // fwidth in the halftone pass needs this, and it has to be asked for
    // before the program that uses it is linked.
    gl.getExtension("OES_standard_derivatives");

    const trailProgram = linkProgram(gl, VERT_SHADER, TRAIL_FRAG);
    const halftoneProgram = linkProgram(gl, VERT_SHADER, HALFTONE_FRAG);
    if (!trailProgram || !halftoneProgram) {
      throw new Error("shader compilation failed");
    }
    this.trailProgram = trailProgram;
    this.halftoneProgram = halftoneProgram;

    this.tPosLoc = gl.getAttribLocation(trailProgram, "position");
    this.tPrevLoc = gl.getUniformLocation(trailProgram, "uPrevTrail");
    this.tMouseLoc = gl.getUniformLocation(trailProgram, "uMouse");
    this.tMouseDirLoc = gl.getUniformLocation(trailProgram, "uMouseDir");
    this.tVelocityLoc = gl.getUniformLocation(trailProgram, "uVelocity");
    this.tDecayLoc = gl.getUniformLocation(trailProgram, "uDecay");
    this.tBrushLoc = gl.getUniformLocation(trailProgram, "uBrushSize");
    this.tAspectLoc = gl.getUniformLocation(trailProgram, "uAspect");
    this.tRevealLoc = gl.getUniformLocation(trailProgram, "uReveal");

    this.hPosLoc = gl.getAttribLocation(halftoneProgram, "position");
    this.hTrailLoc = gl.getUniformLocation(halftoneProgram, "uTrailTexture");
    this.hResLoc = gl.getUniformLocation(halftoneProgram, "uResolution");
    this.hCellLoc = gl.getUniformLocation(halftoneProgram, "uCellSize");
    this.hColorLoc = gl.getUniformLocation(halftoneProgram, "uColor");
    this.hOpacityLoc = gl.getUniformLocation(halftoneProgram, "uOpacity");

    this.fboA = createFBO(gl, FIELD);
    this.fboB = createFBO(gl, FIELD);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.fb);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("buffer creation failed");
    this.positionBuffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.tick = this.tick.bind(this);
  }

  /**
   * The overlay is fixed to the viewport, so client coordinates are already
   * relative to it. The original measured a container rect on every pointer
   * event, which is a forced layout per event for a rectangle that here is
   * always the window.
   */
  updatePointer(clientX: number, clientY: number) {
    if (this.width <= 0 || this.height <= 0) return;

    const prevX = this.mouseX;
    const prevY = this.mouseY;
    this.mouseX = clientX / this.width;
    this.mouseY = 1 - clientY / this.height;

    const aspect = this.width / this.height || 1;
    const dx = (this.mouseX - prevX) * aspect;
    const dy = this.mouseY - prevY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.velocity = Math.min(this.config.speedScale * dist, 1);
    if (dist > 1e-4) {
      this.dirX = dx / dist;
      this.dirY = dy / dist;
    }

    const now = performance.now();

    // Only hit test when something asked for it, and not on every event. The
    // original called elementFromPoint unconditionally, even with no selector
    // set, which is a forced layout on every pointer move for an answer
    // nobody was going to use.
    if (!this.config.hoverSelector) {
      this.hovering = false;
    } else if (now - this.lastHitAt > HIT_MS) {
      this.lastHitAt = now;
      this.hovering = !!document
        .elementFromPoint(clientX, clientY)
        ?.closest(this.config.hoverSelector);
    }

    this.lastActivity = now;
    this.wake();
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  setColor(rgb: [number, number, number]) {
    this.colorRGB = rgb;
  }

  wake() {
    if (this.rafId === 0) this.rafId = requestAnimationFrame(this.tick);
  }

  private tick(now: number) {
    const gl = this.gl;

    if (this.width <= 0 || this.height <= 0) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.reveal = lerp(this.reveal, 1, 0.04);
    const targetBrush = this.hovering
      ? this.config.hoverBrushSize
      : this.config.brushSize;
    this.currentBrushSize = lerp(this.currentBrushSize, targetBrush, 0.08);
    const targetOpacity = this.hovering
      ? this.config.hoverOpacity
      : this.config.opacity;
    this.currentOpacity = lerp(this.currentOpacity, targetOpacity, 0.08);
    this.velocity *= 0.9;

    // Pass one: advance the field into the spare buffer.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.fb);
    gl.viewport(0, 0, FIELD, FIELD);
    gl.useProgram(this.trailProgram);
    gl.enableVertexAttribArray(this.tPosLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(this.tPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.texture);
    gl.uniform1i(this.tPrevLoc, 0);
    gl.uniform2f(this.tMouseLoc, this.mouseX, this.mouseY);
    gl.uniform2f(this.tMouseDirLoc, this.dirX, this.dirY);
    gl.uniform1f(this.tVelocityLoc, this.velocity);
    gl.uniform1f(this.tDecayLoc, this.config.decay);
    gl.uniform1f(this.tBrushLoc, this.currentBrushSize);
    gl.uniform1f(this.tAspectLoc, this.width / this.height || 1);
    gl.uniform1f(this.tRevealLoc, this.reveal);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const spare = this.fboA;
    this.fboA = this.fboB;
    this.fboB = spare;

    // Pass two: read it back as halftone dots, onto the screen.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width * dpr, this.height * dpr);
    gl.useProgram(this.halftoneProgram);
    gl.enableVertexAttribArray(this.hPosLoc);
    gl.vertexAttribPointer(this.hPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.texture);
    gl.uniform1i(this.hTrailLoc, 0);
    gl.uniform2f(this.hResLoc, this.width * dpr, this.height * dpr);
    gl.uniform1f(this.hCellLoc, this.config.cellSize);
    gl.uniform3f(
      this.hColorLoc,
      this.colorRGB[0],
      this.colorRGB[1],
      this.colorRGB[2],
    );
    gl.uniform1f(this.hOpacityLoc, this.currentOpacity);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // The field has decayed to nothing and nobody has moved. Stop, rather than
    // running two passes a frame forever behind someone who is reading.
    if (now - this.lastActivity > IDLE_MS) {
      this.rafId = 0;
      return;
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    const gl = this.gl;
    gl.deleteFramebuffer(this.fboA.fb);
    gl.deleteFramebuffer(this.fboB.fb);
    gl.deleteTexture(this.fboA.texture);
    gl.deleteTexture(this.fboB.texture);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteProgram(this.trailProgram);
    gl.deleteProgram(this.halftoneProgram);
  }
}

export function HalftoneTrail({
  cellSize = 11,
  // White, and only white. The overlay is blended with difference, where
  // white is a straight inversion of whatever is behind it; any other ink
  // tints the result and starts hiding what it crosses instead of flipping
  // it. It is also why this needs no theme handling at all.
  color = "#ffffff",
  decay = 0.965,
  brushSize = 0.035,
  // Same as the base, so crossing a photo changes how hard the trail bites
  // and not how big it is. Shrinking as well would read as the effect
  // breaking at the edge of the image rather than easing off over it.
  hoverBrushSize = brushSize,
  // Full strength is safe here in a way it never was before. Turning the
  // opacity down was the only lever when the dots sat on top of the text;
  // inverting instead, the text stays legible at full weight, so the effect
  // does not have to be quiet to be usable.
  opacity = 1,
  // Over a photo, though, a full inversion is destructive in a way it is not
  // over a word: text has two tones and flips cleanly between them, a
  // photograph has hundreds and comes back as a negative. At this weight the
  // image is washed rather than inverted, and stays itself.
  hoverOpacity = 0.22,
  speedScale = 38,
  // Images only. Links keep the trail at full strength, since a word inverted
  // is still a readable word.
  hoverSelector = "img",
}: {
  cellSize?: number;
  color?: string;
  decay?: number;
  brushSize?: number;
  hoverBrushSize?: number;
  opacity?: number;
  hoverOpacity?: number;
  speedScale?: number;
  hoverSelector?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HalftoneTrailEngine | null>(null);
  const wanted = usePointerDecoration();

  useEffect(() => {
    if (!wanted) return;
    const host = container.current;
    const surface = canvas.current;
    if (!host || !surface) return;

    let engine: HalftoneTrailEngine;
    try {
      engine = new HalftoneTrailEngine(surface, {
        decay,
        brushSize,
        hoverBrushSize,
        opacity,
        hoverOpacity,
        speedScale,
        cellSize,
        hoverSelector,
      });
    } catch {
      // No webgl, or the driver refused the shaders. Nothing is drawn and the
      // page is exactly as it would be without this. Deliberately not react
      // state: there is nothing to re-render, and setting state here would be
      // a cascading render for a case that changes no markup.
      return;
    }
    engineRef.current = engine;
    engine.setColor(resolveColor(host, color));

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      engine.updatePointer(event.clientX, event.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });

    const sized = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      if (w <= 0 || h <= 0) return;
      engine.resize(w, h);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = w * dpr;
      surface.height = h * dpr;
    });
    sized.observe(host);

    return () => {
      engine.destroy();
      engineRef.current = null;
      window.removeEventListener("pointermove", move);
      sized.disconnect();
    };
  }, [
    wanted,
    cellSize,
    decay,
    brushSize,
    hoverBrushSize,
    opacity,
    hoverOpacity,
    speedScale,
    hoverSelector,
    color,
  ]);

  // The tokens change with the theme, so the resolved rgb has to be read again
  // when next-themes swaps the class on <html>.
  useEffect(() => {
    if (!wanted) return;
    const host = container.current;
    if (!host) return;

    const update = () => engineRef.current?.setColor(resolveColor(host, color));
    const themes = new MutationObserver(update);
    themes.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => themes.disconnect();
  }, [wanted, color]);

  if (!wanted) return null;

  return (
    <div
      ref={container}
      aria-hidden="true"
      style={{
        // Fixed, not absolute. The original is absolute inset-0 for a relative
        // card; here there is no card, and absolute would resolve against
        // whatever ancestor happened to be positioned.
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        // Painted over the page and subtracted from it, so a dot crossing a
        // word inverts that word rather than covering it. Measured: light
        // theme, page 247 becomes 8 and text 46 becomes 209; dark theme, page
        // 37 becomes 218 and text 255 becomes 0. Strong in both, legible in
        // both, and adapting to the theme without being told which is active.
        //
        // Hiding behind the text was the alternative, and it cannot work: the
        // dots were then drawn in a colour that had to differ from the text
        // to be visible and differ from the page to be seen at all, which
        // left only faint greys.
        mixBlendMode: "difference",
        // Never between anyone and what they are clicking. This is the only
        // thing keeping the overlay out of the way now that it sits on top of
        // the page: clicks on a link or a photo pass straight through.
        pointerEvents: "none",
        // Below the curtain, so the page fade still covers this.
        zIndex: 50,
      }}
    >
      <canvas
        ref={canvas}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
