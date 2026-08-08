/**
 * config.js — the single source of truth for behaviour.
 *
 * Every timing, threshold, feature flag and piece of sequence copy lives
 * here. No module hard-codes a duration or a string that belongs to the
 * sequence; they read from this object. Retuning the opening is editing
 * numbers in one file, not hunting for `setTimeout` calls across modules.
 *
 * Prose content deliberately does NOT live here — it stays in index.html so
 * the page is complete without JavaScript. See docs/adr/0003-content-in-markup.md.
 *
 * @module config
 */

/**
 * Global pace of the opening. Every duration below is authored at 1× and
 * scaled through this, and the same value is published to CSS as `--tempo`
 * so keyframe durations move with it — one number changes the whole
 * sequence, and JS and CSS can never drift apart.
 *
 * 1 = the original cut. Above 1 is slower.
 */
export const TEMPO = 1.25;

/**
 * Scale a table of millisecond values by TEMPO.
 * @template {Record<string, number>} T
 * @param {T} table
 * @returns {Readonly<T>}
 */
function paced(table) {
  return Object.freeze(/** @type {T} */ (Object.fromEntries(
    Object.entries(table).map(([key, ms]) => [key, Math.round(ms * TEMPO)])
  )));
}

/** @typedef {{ label: string, tone?: 'mint' | 'violet' }} Fragment */
/** @typedef {{ text: string, kind: 'note' | 'call' | 'arg' | 'result', ok?: string }} TraceLine */

export const FEATURES = Object.freeze({
  /**
   * When true the cold open plays only once per browser tab.
   * When false (default) it replays on every load — a first-time visitor
   * sees it either way, and reloads stay honest while iterating.
   */
  playIntroOncePerSession: false,

  /** Storage key used only when the flag above is enabled. */
  introSessionKey: 'cold-open-played'
});

/**
 * The opening sequence, in milliseconds from start.
 * Six acts. Adjusting one act means changing one number here.
 */
export const TIMELINE = paced({
  // Act I — the void
  sayAwaiting: 500,
  sayIntent: 1600,

  // Act II — compression
  sayCompressing: 2600,
  vibrationStart: 2700,
  ring1: 2700,
  ring2: 3400,
  ring3: 4100,
  sayDensity: 4400,
  critical: 4900,
  sayCriticalMass: 5200,

  // Act III — detonation
  detonate: 5400,

  // Act IV — matter
  shardWave1: 6400,
  fieldCools: 6900,
  shardWave2: 7300,
  shardWave3: 8100,
  constellation: 9200,

  // Act V — the statement
  matterRecedes: 10200,
  statement: 10400,
  shout: 11900,
  bloom: 13500,

  // Act VI — the bio
  copyRecedes: 14300,
  // The recede runs 900ms; the buffer keeps the statement from still
  // being on screen as the bio fades up behind it.
  bio: 15500,

  // Act VII — handoff. Fired when the bio finishes typing rather than on a
  // fixed beat, so the copy can be rewritten without retiming the sequence.
  end: 15000
});

/** Per-element stagger, in milliseconds. */
export const CADENCE = Object.freeze({
  ...paced({
    shardStagger: 110,
    constellationStagger: 55,
    wordStagger: 165,
    charStagger: 85,
    heroStagger: 110,
    traceMinGap: 90,
    traceJitter: 260,
    traceLeadIn: 300,
    /** Beat the readout holds empty while swapping lines. */
    readoutSwap: 260
  }),
  /** How long each collapse ring takes to tighten. */
  ringDurations: Object.freeze([2000, 1700, 1200].map((ms) => Math.round(ms * TEMPO)))
});

/**
 * The handoff, in milliseconds after the sequence ends. Separate from
 * TIMELINE because these are offsets from `end()`, which the skip button can
 * trigger at any point.
 */
export const HANDOFF = paced({
  heroDelay: 220,
  removeOverlay: 850,
  startTrace: 900,
  /** Beat the closing line is left on screen before the page arrives. */
  holdAfterBio: 1400
});

/**
 * The typed bio.
 *
 * Deliberately *not* scaled by TEMPO — this is prose being read, not motion
 * being watched, so it is set from reading speed rather than from the pace of
 * the sequence around it. Comfortable prose reading is roughly 25 characters
 * per second; 38ms per character lands just under that, which leaves the
 * reader slightly ahead of the cursor rather than chasing it.
 */
export const BIO = Object.freeze({
  charDelay: 38,
  pauseOnPunctuation: 260
});

/** Skim / full reading modes. */
export const VIEW = Object.freeze({
  defaultMode: 'full',
  storageKey: 'view-mode'
});

/** The reverse big bang: everything collapses back to the singularity. */
export const IMPLODE = Object.freeze({
  /** Inward acceleration per frame, as a fraction of distance to centre. */
  pull: 0.045,
  /** Velocity retained per frame; below 1 the collapse keeps tightening. */
  drag: 0.94,
  /** How long the collapse runs before the page reloads into the intro. */
  duration: 1500
});

/**
 * Vibration ramp. Amplitude and frequency both interpolate on an ease-in
 * curve across `duration`, so escalation is felt late rather than evenly.
 */
export const VIBRATION = Object.freeze({
  amplitudeFrom: 0.35,   // px
  amplitudeTo: 11,       // px
  periodFrom: 190,       // ms per shake cycle
  periodTo: 42,          // ms
  duration: 2700,        // ms — spans the whole compression act
  /** navigator.vibrate pattern: alternating pulse/pause, escalating. */
  hapticRamp: Object.freeze([8, 260, 12, 220, 18, 180, 26, 140, 40, 100, 60, 70, 90]),
  hapticImpact: 180
});

/** Particle system tuning. */
export const FIELD = Object.freeze({
  maxParticles: 64,
  /** One particle per this many square px, up to maxParticles. */
  areaPerParticle: 26000,
  /** Squared px distance within which two particles are wired together. */
  linkDistanceSq: 26000,
  /** Debris multiplier at detonation; culled back to ambient density. */
  burstMultiplier: 2,
  burstSpeedMin: 5.5,
  burstSpeedRange: 15,
  /** Vertical squash of the blast — reads more cinematic than a circle. */
  burstOblateness: 0.82,
  burstDrag: 0.972,
  coolRate: 0.006,
  maxDevicePixelRatio: 2,

  /** Squared px radius of the gravity well that follows the cursor. */
  pointerRangeSq: 34000,
  /** Strength of that well, as a fraction of distance applied per frame. */
  pointerPull: 0.0016,

  /**
   * White light separates into this on the way out. Debris is coloured by
   * ejection speed — fastest carries the blue end, slowest the red.
   */
  spectrum: Object.freeze([
    [255, 255, 255], [255, 77, 109], [255, 154, 60], [255, 224, 102],
    [61, 245, 196], [79, 216, 255], [139, 123, 255], [232, 110, 255]
  ]),

  /** Where the debris cools to. These are --violet and --mint in tokens.css. */
  settled: Object.freeze([[139, 123, 255], [61, 245, 196]])
});

/** Copy shown during the opening. Casing is intentional — leave it. */
export const INTRO_COPY = Object.freeze({
  readout: Object.freeze({
    awaiting: 'awaiting input',
    intent: 'intent received',
    compressing: 'compressing ten years into one point',
    density: 'density rising',
    critical: 'critical mass'
  }),
  statement: 'This was made by AI.',
  shout: 'EnTiReLy!'
});

/**
 * Fragments thrown outward by the blast. Each is a real artefact from one
 * of the systems documented on the page — the explosion argues the case too.
 * @type {ReadonlyArray<Fragment>}
 */
export const FRAGMENTS = Object.freeze([
  { label: 'tool_use', tone: 'mint' },
  { label: '{ tenant: server }' },
  { label: 'runCopilot()', tone: 'mint' },
  { label: '≤ 6 rounds' },
  { label: 'injection: blocked', tone: 'violet' },
  { label: '7 agents', tone: 'mint' },
  { label: 'checkpoint ✔' },
  { label: 'Haiku → Sonnet', tone: 'violet' },
  { label: 'strict: true' },
  { label: 'self-heal', tone: 'mint' },
  { label: '67K LOC' },
  { label: 'ADR-012', tone: 'violet' },
  { label: 'PostgreSQL' },
  { label: 'aggregates only', tone: 'mint' }
]);

/**
 * Spare artefacts the fragments cycle through. A fragment periodically
 * shatters and reforms carrying a different one, so the field keeps moving
 * without anything new entering the scene. Every entry is real: an ADR that
 * exists, a guarantee the code actually makes.
 */
export const FRAGMENT_POOL = Object.freeze([
  'RLS enabled', 'zero PII', 'idempotent', 'checkpointed', 'Playwright ✔',
  'strict TS', 'no innerHTML', 'CSP: deny-all', 'rate-limited', 'fails open',
  'Expo SDK 56', 'vector recall', 'reversible migration', '6 locales',
  'conventional commits', 'ADR-004', 'bounded loop', 'server-resolved',
  'audited pre-launch', 'no secrets in git'
]);

/** How often a fragment shatters and comes back carrying something else. */
export const FRAGMENT_CYCLE = paced({
  minDelay: 1400,
  maxDelay: 4200,
  /** Must match the shatter animation in cold-open.css, which scales too. */
  shatterDuration: 520
});

/**
 * The two fragments everything reassembles into. These are the only
 * navigation the opening stage offers.
 */
export const STAGE_NAV = Object.freeze([
  { label: 'Case studies', action: 'enter', href: '#work' },
  { label: 'Download CV', action: 'download', href: 'assets/ambassador-eugene-cv.pdf' }
]);

/**
 * The collapse that reassembles the fragments into the two nav pieces.
 * Targets are measured from the nav's real position rather than assumed, so
 * the pieces converge on exactly where the buttons appear.
 */
export const CONVERGE = Object.freeze({
  ...paced({
    /** Must match the converge transition in cold-open.css. */
    duration: 900,
    /** Beat between the quake starting and the pieces being drawn in. */
    formDelay: 620,
    stagger: 45,
    /** Beat after the nav forms before fresh fragments return. */
    respawnDelay: 900
  })
});

/**
 * Fragments return after the reassembly, so the stage keeps breathing rather
 * than emptying out once the nav has formed. They come back further out than
 * the first burst, since the panel below the copy now occupies more of the
 * centre.
 */
export const RESPAWN = Object.freeze({
  radiusRatio: 0.44,
  radiusRatioNarrow: 0.40,
  /** Vertical half-height of the region the panel occupies, as vmin. */
  panelBand: 0.30,
  stagger: Math.round(90 * TEMPO)
});

/** Geometry for scattering fragments without covering the copy. */
export const SHARD_LAYOUT = Object.freeze({
  radiusRatio: 0.34,
  radiusRatioNarrow: 0.30,
  narrowBreakpoint: 760,
  radiusJitter: 0.1,
  /** Horizontal stretch, so the ring matches a landscape viewport. */
  horizontalStretch: 1.55,
  /** Fragments landing within this band of the centre line are pushed off it. */
  copyBand: 0.42,
  copyBandPush: 0.55,
  maxRotation: 50,
  waves: Object.freeze([[0, 5], [5, 10], [10, 14]])
});

/**
 * The hero console. Written as data so the console is retimed and rewritten
 * without touching the renderer.
 * @type {ReadonlyArray<TraceLine>}
 */
export const TRACE_SCRIPT = Object.freeze([
  { kind: 'note', text: '// this page, assembling itself' },
  { kind: 'call', text: '▸ init(candidate)' },
  { kind: 'result', text: '  ↳ 10 yrs · react · node · agent systems', ok: '12ms' },
  { kind: 'call', text: '▸ tool_use: load_case_study' },
  { kind: 'arg', text: '  { id: "tadhkir", depth: "full" }' },
  { kind: 'result', text: '  ↳ guardrails · tenant isolation · model tiering', ok: 'ok' },
  { kind: 'call', text: '▸ tool_use: load_case_study' },
  { kind: 'arg', text: '  { id: "eugenius", depth: "full" }' },
  { kind: 'result', text: '  ↳ 7 agents · durable exec · self-healing loop', ok: 'ok' },
  { kind: 'call', text: '▸ tool_use: load_case_study' },
  { kind: 'arg', text: '  { id: "zerli", depth: "full" }' },
  { kind: 'result', text: '  ↳ legacy audit · phased migration · tenancy', ok: 'ok' },
  { kind: 'call', text: '▸ render(portfolio)' },
  { kind: 'result', text: '  ↳ 3 systems ready. scroll to inspect.' }
]);

/** Capability strip. */
export const MARQUEE_ITEMS = Object.freeze([
  'Agent orchestration', 'Bounded tool loops', 'Prompt-injection defence',
  'Multi-model routing', 'Durable execution', 'RAG + Pinecone',
  'Multi-tenant isolation', 'TypeScript (strict)', 'React · React Native',
  'Node.js', 'PostgreSQL · Supabase', 'Stripe · Paystack', 'Evals & tracing',
  'Next.js', 'Inngest', 'i18n at compile time'
]);

/** Scroll-reveal observer bounds. */
export const REVEAL = Object.freeze({
  rootMargin: '0px 0px -12% 0px',
  threshold: 0.05
});
