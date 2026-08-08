/**
 * particle-field.js — the animated backdrop.
 *
 * One particle system with two phases:
 *
 *   BANG    every particle is reseeded at the centre with radial velocity
 *           and a spectral colour chosen by its ejection speed.
 *   AMBIENT the same particles, decelerated, drifting, wired with edges,
 *           and cooled from the spectrum back to the house palette.
 *
 * The background the page is read on is literally the debris from the
 * opening. That continuity is the point — see docs/adr/0002-one-particle-system.md.
 *
 * Owns no DOM beyond its canvas and knows nothing about the sequence that
 * drives it; the cold open holds a reference and calls two methods.
 *
 * @module particle-field
 */

import { FIELD, IMPLODE } from './config.js';
import { supportsCanvas } from './env.js';

/**
 * @typedef {object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} r      Radius in px.
 * @property {number[]} from Spectral RGB at ejection.
 * @property {number[]} to   RGB it cools toward.
 */

/**
 * @typedef {object} ParticleField
 * @property {() => void} bang     Detonate: reseed at centre, hot and fast.
 * @property {() => void} ambient  Cool into the drifting graph.
 * @property {() => void} implode  Run the blast backwards, into the centre.
 * @property {(x: number, y: number) => void} attract  Move the gravity well.
 * @property {() => void} destroy  Stop animating and release listeners.
 */

/** A field that does nothing — returned when animation is unavailable. */
const INERT = Object.freeze({
  bang() {},
  ambient() {},
  implode() {},
  attract() {},
  destroy() {}
});

/**
 * @param {HTMLCanvasElement | null} canvas
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] False yields an inert field, so
 *   callers never branch on reduced-motion themselves.
 * @returns {ParticleField}
 */
export function createParticleField(canvas, { enabled = true } = {}) {
  if (!enabled || !supportsCanvas(canvas)) return INERT;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, FIELD.maxDevicePixelRatio);

  /** @type {Particle[]} */
  let particles = [];
  let width = 0;
  let height = 0;
  /** @type {number | null} */
  let frameId = null;
  /** @type {number | undefined} */
  let resizeTimer;

  /** @type {'ambient' | 'bang' | 'implode'} */
  let mode = 'ambient';
  let edgeAlpha = 1;   // 0 → 1 as matter cools and the graph wires up
  let drag = 1;        // per-frame velocity multiplier
  let cool = 1;        // 0 = white-hot spectrum, 1 = settled palette

  /** Gravity well tracking the cursor. Idle until the pointer moves. */
  const pointer = { x: 0, y: 0, active: false };

  /** Target particle count for the current viewport. */
  const targetCount = () =>
    Math.min(FIELD.maxParticles, Math.round((width * height) / FIELD.areaPerParticle));

  /** Ambient seeding: scattered, slow, already at the settled palette. */
  function seedAmbient() {
    particles = Array.from({ length: targetCount() }, (_, i) => {
      const settled = FIELD.settled[i % FIELD.settled.length];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.4 + 0.5,
        from: settled,
        to: settled
      };
    });
  }

  /**
   * Pick a spectral colour for a given ejection speed. Fastest debris carries
   * the blue end, slowest the red, so the blast disperses like light through
   * a prism. A quarter is randomised so the banding never reads as a gradient.
   *
   * @param {number} speed
   * @returns {number[]} RGB triple.
   */
  function spectralFor(speed) {
    const bands = FIELD.spectrum.length;
    const banded = Math.min(bands - 1,
      Math.floor(((speed - FIELD.burstSpeedMin) / FIELD.burstSpeedRange) * bands));
    const index = Math.random() < 0.75 ? banded : Math.floor(Math.random() * bands);
    return FIELD.spectrum[index];
  }

  function bang() {
    if (!width || !height) return;

    const total = Math.round(targetCount() * FIELD.burstMultiplier);
    particles = Array.from({ length: total }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      // Shell bias rather than a uniform disc — reads as a blast, not a cloud.
      const speed = FIELD.burstSpeedMin + Math.pow(Math.random(), 0.55) * FIELD.burstSpeedRange;
      return {
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * FIELD.burstOblateness,
        r: Math.random() * 1.8 + 0.4,
        from: spectralFor(speed),
        to: FIELD.settled[i % FIELD.settled.length]
      };
    });

    mode = 'bang';
    edgeAlpha = 0;
    cool = 0;
    drag = FIELD.burstDrag;
    start();
  }

  function ambient() {
    mode = 'ambient';
    start();
  }

  /**
   * The reverse big bang. Rather than reseeding, the existing particles are
   * accelerated toward the centre and re-heated through the spectrum — the
   * detonation played backwards on the same matter.
   */
  function implode() {
    for (const p of particles) {
      // Swap the cooled colour back to a spectral one to run the fade in reverse.
      p.from = p.to;
      p.to = FIELD.spectrum[Math.floor(Math.random() * FIELD.spectrum.length)];
    }
    mode = 'implode';
    cool = 1;
    drag = IMPLODE.drag;
    start();
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Reseeding mid-blast would erase it; the blast is short and never resized.
    if (mode !== 'bang') seedAmbient();
  }

  /** Advance positions, and let the settled phase relax back toward drift. */
  function step() {
    if (mode === 'ambient') {
      drag += (1 - drag) * 0.04;
      edgeAlpha += (1 - edgeAlpha) * 0.02;
      if (cool < 1) cool = Math.min(1, cool + FIELD.coolRate);
      // Shed surplus debris until we land back at ambient density.
      if (particles.length > targetCount() && Math.random() < 0.6) particles.pop();
    } else if (mode === 'implode') {
      // Re-heat as it collapses: the cooling curve, run backwards.
      cool = Math.max(0, cool - FIELD.coolRate * 4);
      edgeAlpha = Math.max(0, edgeAlpha - 0.05);
    }

    for (const p of particles) {
      if (mode === 'implode') {
        p.vx += (width / 2 - p.x) * IMPLODE.pull;
        p.vy += (height / 2 - p.y) * IMPLODE.pull;
      } else if (pointer.active) {
        // A gravity well under the cursor: near particles lean toward it.
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dsq = dx * dx + dy * dy;
        if (dsq < FIELD.pointerRangeSq && dsq > 1) {
          const falloff = (1 - dsq / FIELD.pointerRangeSq) * FIELD.pointerPull;
          p.vx += dx * falloff;
          p.vy += dy * falloff;
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= drag;
      p.vy *= drag;

      // Never let a particle come fully to rest.
      if (mode === 'ambient' && Math.abs(p.vx) + Math.abs(p.vy) < 0.02) {
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;
      }

      // Wrapping mid-collapse would fling particles back out.
      if (mode === 'implode') continue;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
    }
  }

  /** Edges are skipped entirely while matter is still in flight. */
  function drawEdges() {
    if (edgeAlpha <= 0.02) return;
    const limit = FIELD.linkDistanceSq;

    for (let a = 0; a < particles.length; a += 1) {
      for (let b = a + 1; b < particles.length; b += 1) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dsq = dx * dx + dy * dy;
        if (dsq >= limit) continue;

        ctx.strokeStyle = `rgba(61,245,196,${((1 - dsq / limit) * 0.16 * edgeAlpha).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }

  /** Particles are prismatic while hot, lerping to the palette as they cool. */
  function drawParticles() {
    const alpha = (0.5 + (1 - cool) * 0.42).toFixed(2);
    const swell = 1 + (1 - cool) * 0.5;

    for (const p of particles) {
      const r = Math.round(p.from[0] + (p.to[0] - p.from[0]) * cool);
      const g = Math.round(p.from[1] + (p.to[1] - p.from[1]) * cool);
      const b = Math.round(p.from[2] + (p.to[2] - p.from[2]) * cool);

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * swell, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame() {
    ctx.clearRect(0, 0, width, height);
    step();
    drawEdges();
    drawParticles();
    frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (frameId === null) frame();
  }

  function stop() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 180);
  };

  // Animating an offscreen tab burns battery for nothing.
  const onVisibility = () => (document.hidden ? stop() : start());

  /** @param {PointerEvent} event */
  const onPointer = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  };
  const onPointerLeave = () => { pointer.active = false; };

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  // Passive: the well never needs to block or cancel the gesture.
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);

  resize();
  start();

  return Object.freeze({
    bang,
    ambient,
    implode,
    /**
     * @param {number} x
     * @param {number} y
     */
    attract(x, y) {
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    },
    destroy() {
      stop();
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onPointerLeave);
    }
  });
}
