/**
 * vibration.js — the shake that grows with the mass.
 *
 * Amplitude and frequency are interpolated per frame and written to two CSS
 * custom properties; the keyframes in cold-open.css read them live. Driving
 * an existing animation through variables rather than swapping discrete
 * shake classes is what makes the escalation continuous instead of stepped.
 *
 * The curve is cubic ease-in, so the shake is imperceptible while mass is
 * still gathering and violent by critical mass — pressure building, rather
 * than a constant buzz.
 *
 * @module vibration
 */

import { VIBRATION } from './config.js';
import { haptic } from './env.js';

/**
 * @typedef {object} Vibration
 * @property {() => void} ramp Begin escalating, and fire matching haptics.
 * @property {() => void} stop Halt immediately and reset amplitude to zero.
 */

/**
 * @param {HTMLElement | null} target Element the shake is applied to.
 * @returns {Vibration}
 */
export function createVibration(target) {
  if (!target) return Object.freeze({ ramp() {}, stop() {} });

  /** @type {number | null} */
  let frameId = null;

  function stop() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    target.classList.remove('is-trembling');
    target.style.setProperty('--amp', '0px');
    haptic(0);
  }

  function ramp() {
    const {
      amplitudeFrom, amplitudeTo, periodFrom, periodTo, duration, hapticRamp
    } = VIBRATION;

    const startedAt = performance.now();
    target.classList.add('is-trembling');
    haptic(hapticRamp);

    /** @param {number} now */
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = t * t * t;

      const amplitude = amplitudeFrom + (amplitudeTo - amplitudeFrom) * eased;
      const period = periodFrom + (periodTo - periodFrom) * eased;

      target.style.setProperty('--amp', `${amplitude.toFixed(2)}px`);
      target.style.setProperty('--tdur', `${period.toFixed(0)}ms`);

      frameId = t < 1 ? requestAnimationFrame(tick) : null;
    };

    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(tick);
  }

  return Object.freeze({ ramp, stop });
}

/**
 * The single hard pulse at detonation.
 * @returns {void}
 */
export function impact() {
  haptic(VIBRATION.hapticImpact);
}
