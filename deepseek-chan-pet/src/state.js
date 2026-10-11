/**
 * Pure state: preferences, the DSH session projection and the pet "brain".
 * No DOM, no timers: wall-clock time and randomness are injected so every
 * behaviour is unit-testable (tests/state.test.mjs).
 */
import { pickLine, emotionOf } from './dialogue.js';

export const STORAGE_KEY = 'dsh-plugin-deepseek-chan:v1';
export const SLEEP_CHOICES = Object.freeze([30000, 120000, 300000, 0]);
export const DEFAULTS = Object.freeze({
  scale: 1, hidden: false, motion: true, chatter: true, wheelResize: true,
  scope: 'global', sleepAfterMs: 120000, language: 'auto', x: null, y: null,
});
export const MIN_SCALE = 0.6;
export const MAX_SCALE = 1.8;

export function cleanPreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  return {
    scale: finite(source.scale) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, source.scale)) : DEFAULTS.scale,
    hidden: source.hidden === true,
    motion: source.motion !== false,
    chatter: source.chatter !== false,
    wheelResize: source.wheelResize !== false,
    scope: source.scope === 'current' ? 'current' : 'global',
    sleepAfterMs: SLEEP_CHOICES.includes(source.sleepAfterMs) ? source.sleepAfterMs : DEFAULTS.sleepAfterMs,
    language: ['tr', 'en', 'zh'].includes(source.language) ? source.language : 'auto',
    x: finite(source.x) ? source.x : null,
    y: finite(source.y) ? source.y : null,
  };
}

export function clampPosition(x, y, width, height, viewportWidth, viewportHeight, top = 56) {
  const margin = 8;
  const maxX = Math.max(margin, viewportWidth - width - margin);
  const maxY = Math.max(margin, viewportHeight - height - margin);
  return {
    x: Math.min(maxX, Math.max(margin, x)),
    y: Math.min(maxY, Math.max(Math.min(top, maxY), y)),
  };
}

/**
 * Projects DSH's session catalog + live status into what the pet cares about.
 * "done" is a running -> stopped edge of a main session with nothing pending.
 * DSH's client status does not say *why* a turn stopped, so a cancelled turn
 * also counts; baselines (mount, reconnect, scope change) never celebrate.
 */
export class SessionTracker {
  constructor() {
    this.previous = new Map();
    this.key = undefined;
    this.connected = undefined;
    this.doneSeq = 0;
  }
  update({ catalog, statuses, connected, currentSessionId, scope } = {}) {
    const key = scope === 'current' ? `current:${currentSessionId || ''}` : 'global';
    const baseline = key !== this.key || connected !== this.connected;
    if (baseline) { this.previous.clear(); this.key = key; this.connected = connected; }
    const byId = catalog?.byId || {};
    const ids = new Set([...Object.keys(byId), ...(statuses?.keys?.() || [])]);
    let workingCount = 0, waitingCount = 0;
    const seen = new Set();
    for (const id of ids) {
      if (scope === 'current' && id !== currentSessionId) continue;
      seen.add(id);
      const status = statuses?.get?.(id);
      const running = typeof status?.running === 'boolean' ? status.running : byId[id]?.running === true;
      const pending = status?.pendingInteraction != null;
      const main = byId[id] ? byId[id].origin !== 'subagent' : false;
      if (pending) waitingCount++;
      if (main && running && !pending) workingCount++;
      if (!baseline && connected && main && this.previous.get(id) === true && !running && !pending) this.doneSeq++;
      this.previous.set(id, running);
    }
    for (const id of this.previous.keys()) if (!seen.has(id)) this.previous.delete(id);
    const ready = catalog?.phase === 'ready';
    const available = connected === true && (ready || workingCount > 0 || waitingCount > 0)
      && (scope !== 'current' || Boolean(currentSessionId));
    return {
      available, working: workingCount > 0, waiting: waitingCount > 0,
      workingCount, waitingCount, doneSeq: this.doneSeq, scopeKey: key,
    };
  }
}

/** How long each kind of reaction stays on screen (ms). */
export const DURATION = Object.freeze({
  poke: 2600, love: 3200, pat: 3000, angry: 3200, furious: 3200, sulk: 6500, forgive: 3200,
  wake: 2800, dragStart: 1500, drop: 2600, done: 4500, working: 3200, idle: 4500,
  hello: 4200, resize: 1200,
});
export const COMBO_WINDOW_MS = 2500;
export const ANGRY_CLICKS = 5;
export const FURIOUS_CLICKS = 7;
export const SULK_CLICKS = 9;
const SYSTEM = new Set(['done', 'working', 'idle', 'hello']);

/**
 * Decides what the pet shows at a given instant. Priority, high to low:
 * held drag pose > user reaction > waiting > system reaction (done, chatter)
 * > working > sleeping > resting.
 */
export class PetBrain {
  constructor({ now = Date.now(), random = Math.random, sleepAfterMs = DEFAULTS.sleepAfterMs, chatter = true } = {}) {
    this.random = random;
    this.sleepAfterMs = sleepAfterMs;
    this.chatter = chatter;
    this.snapshot = { available: false, working: false, waiting: false, workingCount: 0, doneSeq: 0 };
    this.doneSeen = undefined;
    this.idleSince = now;
    this.reaction = undefined;      // { trigger, line, until, system }
    this.hold = undefined;          // drag pose, lasts until released
    this.clicks = [];
    this.lineSeq = 0;
    this.previous = {};             // last line id per trigger, avoids repeats
    this.waitingLine = undefined;
    this.stateLine = {};
    this.nextChatterAt = now + this.chatterGap();
  }
  chatterGap() { return 60000 + Math.floor((Number(this.random()) || 0) * 90000); }
  pick(trigger, now) {
    const line = pickLine(trigger, { random: this.random, previous: this.previous[trigger], hour: new Date(now).getHours() });
    if (line) { this.previous[trigger] = line.id; this.lineSeq++; }
    return line;
  }
  react(trigger, now = Date.now(), { duration = DURATION[trigger] ?? 2600 } = {}) {
    const line = this.pick(trigger, now);
    if (!line) return this.view(now);
    this.reaction = { trigger, line, until: now + duration, system: SYSTEM.has(trigger), seq: this.lineSeq };
    if (!SYSTEM.has(trigger)) { this.idleSince = now; this.nextChatterAt = now + this.chatterGap(); }
    return this.view(now);
  }
  activeReaction(now) {
    if (this.reaction && now >= this.reaction.until) this.reaction = undefined;
    return this.reaction;
  }
  /** Snapshot from SessionTracker. Starts working/done/waiting notices on edges. */
  update(snapshot, now = Date.now()) {
    const next = snapshot || { available: false };
    const before = this.snapshot;
    const firstSnapshot = this.doneSeen === undefined;
    if (firstSnapshot || next.scopeKey !== before.scopeKey || (next.available && !before.available)) {
      this.doneSeen = next.doneSeq;    // never replay an old completion
    }
    if (next.available) {
      if (next.doneSeq !== this.doneSeen) { this.doneSeen = next.doneSeq; this.snapshot = next; this.react('done', now); }
      else if (next.working && !before.working && !next.waiting && !firstSnapshot) { this.snapshot = next; this.react('working', now); }
      if (next.waiting && !before.waiting) { this.waitingLine = this.pick('waiting', now); }
    }
    if (next.working || next.waiting) this.idleSince = now;
    if ((before.working || before.waiting) && !next.working && !next.waiting) this.idleSince = now;
    this.snapshot = next;
    return this.view(now);
  }
  /** Left click. Counts a combo: quick clicks make her angry (5), furious (7), then sulky (9). */
  poke(now = Date.now()) {
    this.clicks = this.clicks.filter(t => now - t < COMBO_WINDOW_MS);
    this.clicks.push(now);
    const reaction = this.activeReaction(now);
    if (reaction?.trigger === 'sulk') {        // ignores you while sulking
      reaction.until = Math.max(reaction.until, now + 2500);
      return this.view(now);
    }
    if (this.clicks.length >= SULK_CLICKS) { this.clicks = []; return this.react('sulk', now); }
    if (this.clicks.length >= FURIOUS_CLICKS) return this.react('furious', now);
    if (this.clicks.length >= ANGRY_CLICKS) return this.react('angry', now);
    const state = this.baseState(now);
    if (state === 'sleeping') return this.react('wake', now);
    if (state === 'waiting') return this.react('pokeWaiting', now, { duration: DURATION.poke });
    if (state === 'working' && this.random() < 0.6) return this.react('pokeWorking', now, { duration: DURATION.poke });
    return this.react('poke', now);
  }
  love(now = Date.now()) { this.clicks = []; return this.react('love', now); }
  /** Middle click: a head pat. Also the only way to end a sulk early. */
  pat(now = Date.now()) {
    this.clicks = [];
    if (this.activeReaction(now)?.trigger === 'sulk') return this.react('forgive', now);
    return this.react('pat', now);
  }
  dragStart(now = Date.now()) {
    const line = this.pick('dragStart', now);
    this.hold = { trigger: 'dragStart', line, seq: this.lineSeq, fast: false };
    this.reaction = undefined;
    this.idleSince = now;
    return this.view(now);
  }
  /** Shaking her around quickly makes her panic. */
  dragSpeed(speed, now = Date.now()) {
    if (!this.hold) return this.view(now);
    const fast = speed > 2.2;
    if (fast && !this.hold.fast) {
      const line = this.pick('dragFast', now);
      this.hold = { trigger: 'dragFast', line, seq: this.lineSeq, fast: true, calmAt: now + 900 };
    } else if (fast) this.hold.calmAt = now + 900;
    else if (this.hold.fast && now >= this.hold.calmAt) {
      const line = this.pick('dragging', now);
      this.hold = { trigger: 'dragging', line, seq: this.lineSeq, fast: false };
    }
    return this.view(now);
  }
  dragEnd(now = Date.now()) {
    if (!this.hold) return this.view(now);
    this.hold = undefined;
    return this.react('drop', now);
  }
  touch(now = Date.now()) { this.idleSince = now; this.nextChatterAt = now + this.chatterGap(); }
  /** Called on a timer. Fires idle chatter when the pet is resting. */
  tick(now = Date.now()) {
    if (this.chatter && now >= this.nextChatterAt) {
      this.nextChatterAt = now + this.chatterGap();
      if (this.baseState(now) === 'resting' && !this.activeReaction(now) && !this.hold) return this.react('idle', now);
    }
    return this.view(now);
  }
  baseState(now) {
    const s = this.snapshot;
    if (!s.available) return 'unavailable';
    if (s.waiting) return 'waiting';
    if (s.working) return 'working';
    if (this.sleepAfterMs > 0 && now - this.idleSince >= this.sleepAfterMs) return 'sleeping';
    return 'resting';
  }
  stateLineFor(state, now) {
    const trigger = { waiting: 'waiting', working: 'working', sleeping: 'sleeping', unavailable: 'unavailable', resting: 'rest' }[state];
    if (state === 'waiting' && this.waitingLine) return this.waitingLine;
    if (!this.stateLine[state]) this.stateLine[state] = pickLine(trigger, { random: this.random, hour: new Date(now).getHours() });
    return this.stateLine[state];
  }
  view(now = Date.now()) {
    const state = this.baseState(now);
    const reaction = this.activeReaction(now);
    let line, mode = 'hover', seq = 0, trigger = state;
    if (this.hold) {
      ({ line, seq, trigger } = this.hold); mode = 'notice';
    } else if (reaction && !(reaction.system && state === 'waiting')) {
      ({ line, seq, trigger } = reaction); mode = 'notice';
    } else {
      line = this.stateLineFor(state, now);
      if (state === 'waiting') mode = 'notice';
    }
    let emotionName = line?.emotion || 'idle';
    // Without a reaction, the pose follows the session state.
    if (mode === 'hover' || (state === 'waiting' && !reaction && !this.hold)) {
      emotionName = { working: 'go', waiting: 'pleading', sleeping: 'sleepy' }[state] || 'idle';
    }
    if (this.hold && trigger === 'dragging') emotionName = 'carried';
    const emotion = emotionOf(emotionName);
    return {
      state, trigger, emotion: emotionName, pose: emotion.pose, emoji: emotion.emoji,
      anim: emotion.anim, fx: emotion.fx, line, lineSeq: seq, bubble: mode,
      workingCount: state === 'working' ? this.snapshot.workingCount || 0 : 0,
      dragging: Boolean(this.hold),
    };
  }
}
