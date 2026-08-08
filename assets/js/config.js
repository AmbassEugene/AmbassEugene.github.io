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
export const TIMELINE = Object.freeze({
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

  // Act VI — handoff
  copyRecedes: 14300,
  end: 15000
});

/** Per-element stagger and per-ring duration, in milliseconds. */
export const CADENCE = Object.freeze({
  ringDurations: [2000, 1700, 1200],
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
});

/**
 * The handoff, in milliseconds after the sequence ends. Separate from
 * TIMELINE because these are offsets from `end()`, which the skip button can
 * trigger at any point.
 */
export const HANDOFF = Object.freeze({
  heroDelay: 220,
  removeOverlay: 850,
  /** The bio types once the name has landed, before the console starts. */
  startBio: 1100,
  /** Beat between the bio finishing and the console taking over. */
  traceAfterBio: 450,
  /** Used only when the bio is skipped, so the console still arrives. */
  startTrace: 900
});

/** The typed bio in the hero. */
export const BIO = Object.freeze({
  charDelay: 21,
  pauseOnPunctuation: 170
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
