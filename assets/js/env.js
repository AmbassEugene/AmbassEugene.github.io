/**
 * env.js — environment and capability detection.
 *
 * Every question about "can we / should we" is answered here, so no feature
 * module contains its own capability sniffing. Modules ask; they don't probe.
 *
 * @module env
 */

/**
 * Whether the visitor has asked for reduced motion.
 * Read live rather than cached, so a mid-session OS change is respected.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Whether the visitor arrived at a specific section, e.g. `#tadhkir`.
 * Deep links must never be gated behind an opening sequence.
 * @returns {boolean}
 */
export function isDeepLink() {
  return Boolean(window.location.hash);
}

/** @returns {boolean} true when IntersectionObserver is available. */
export function supportsObserver() {
  return 'IntersectionObserver' in window;
}

/**
 * @param {HTMLCanvasElement | null} canvas
 * @returns {boolean} true when a 2D canvas context can be obtained.
 */
export function supportsCanvas(canvas) {
  return Boolean(canvas && typeof canvas.getContext === 'function');
}

/**
 * Session storage that never throws.
 *
 * Private browsing modes and storage-partitioned contexts make sessionStorage
 * throw on access rather than return null, which would otherwise take the
 * whole bootstrap down. Failing closed here means the sequence plays — the
 * safe direction for a purely decorative flag.
 */
export const session = Object.freeze({
  /**
   * @param {string} key
   * @returns {string | null}
   */
  get(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* storage unavailable — the flag is optional, so carry on */
    }
  }
});

/**
 * Fire a haptic pattern where the device supports it.
 *
 * Unsupported on iOS Safari entirely, and gated behind a prior user gesture
 * on some Android browsers. Treated as a bonus: never awaited, never
 * branched on, and any failure is swallowed.
 *
 * @param {number | readonly number[]} pattern Milliseconds, or an alternating
 *   pulse/pause pattern. Pass 0 to cancel.
 * @returns {void}
 */
export function haptic(pattern) {
  try {
    if (typeof navigator.vibrate !== 'function') return;
    // The API mutates nothing; the copy exists only to satisfy its
    // mutable-array signature against our frozen config.
    navigator.vibrate(Array.isArray(pattern) ? [...pattern] : /** @type {number} */ (pattern));
  } catch {
    /* vibration unavailable or blocked — decorative only */
  }
}
