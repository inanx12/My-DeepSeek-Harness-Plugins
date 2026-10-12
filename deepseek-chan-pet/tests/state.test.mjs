import test from 'node:test';
import assert from 'node:assert/strict';
import { PetBrain, SessionTracker, cleanPreferences, clampPosition, ANGRY_CLICKS, FURIOUS_CLICKS, SULK_CLICKS, DURATION } from '../src/state.js';
import { LINES, EMOTIONS, pickLine } from '../src/dialogue.js';
import { resolveLanguage } from '../src/i18n.js';

const catalog = (...ids) => ({ phase: 'ready', byId: Object.fromEntries(ids.map(id => [id, { id, retainedBy: { mainView: id === 'a' ? 1 : 0 } }])) });
const statuses = obj => new Map(Object.entries(obj).map(([id, s]) => [id, { running: s.running, pendingInteraction: s.pending ? {} : undefined }]));
const input = (st, extra = {}) => ({ catalog: catalog('a', 'b'), statuses: statuses(st), connected: true, currentSessionId: 'a', scope: 'global', ...extra });

test('every line uses a known emotion and every emotion has a pose', () => {
  for (const [trigger, pool] of Object.entries(LINES)) {
    for (const line of pool) {
      assert.ok(EMOTIONS[line.emotion], `${line.id} uses unknown emotion ${line.emotion}`);
      for (const lang of ['tr', 'en', 'zh']) assert.ok(line.text[lang], `${line.id} lacks ${lang}`);
    }
    assert.ok(pool.length, trigger);
  }
});

test('pickLine avoids repeating the previous line', () => {
  for (let i = 0; i < 20; i++) assert.notEqual(pickLine('poke', { previous: 'poke.1', random: () => 0 }).id, 'poke.1');
});

test('hour-limited lines only appear in their window', () => {
  const ids = h => new Set(Array.from({ length: 50 }, (_, i) => pickLine('idle', { random: () => i / 50, hour: h }).id));
  assert.ok(ids(8).has('idle.morning')); assert.ok(!ids(15).has('idle.morning'));
  assert.ok(ids(1).has('idle.night')); assert.ok(!ids(15).has('idle.night'));
});

test('tracker: a running -> stopped edge counts as done, baselines do not', () => {
  const t = new SessionTracker();
  assert.equal(t.update(input({ a: { running: true } })).doneSeq, 0);      // baseline
  const s = t.update(input({ a: { running: true } }));
  assert.equal(s.workingCount, 1); assert.equal(s.working, true);
  assert.equal(t.update(input({ a: { running: false } })).doneSeq, 1);
  // stopping while a request waits is not "done"
  t.update(input({ a: { running: true } }));
  assert.equal(t.update(input({ a: { running: false, pending: true } })).doneSeq, 1);
});

test('tracker: subagents never count, current scope filters', () => {
  const t = new SessionTracker();
  const cat = catalog('a', 'b'); cat.byId.b.origin = 'subagent';
  const s = t.update({ catalog: cat, statuses: statuses({ b: { running: true } }), connected: true, currentSessionId: 'a', scope: 'global' });
  assert.equal(s.workingCount, 0);
  const c = t.update(input({ b: { running: true } }, { scope: 'current' }));
  assert.equal(c.workingCount, 0); assert.equal(c.available, true);
});

test('tracker: reconnect is a baseline', () => {
  const t = new SessionTracker();
  t.update(input({ a: { running: true } }));
  t.update(input({ a: { running: true } }, { connected: false }));
  assert.equal(t.update(input({ a: { running: false } })).doneSeq, 0);
});

test('brain: done celebrates once, and not on the first snapshot', () => {
  const b = new PetBrain({ now: 0, random: () => 0 });
  b.update({ available: true, doneSeq: 3, scopeKey: 'global' }, 0);
  assert.notEqual(b.view(10).trigger, 'done');
  b.update({ available: true, working: true, doneSeq: 3, workingCount: 1, scopeKey: 'global' }, 100);
  assert.equal(b.view(100).trigger, 'working');
  b.update({ available: true, doneSeq: 4, scopeKey: 'global' }, 200);
  const v = b.view(300);
  assert.equal(v.trigger, 'done'); assert.equal(v.bubble, 'notice');
  assert.equal(b.view(200 + DURATION.done + 1).trigger, 'resting');
});

test('brain: waiting outranks system notices but not the user', () => {
  const b = new PetBrain({ now: 0, random: () => 0 });
  b.update({ available: true, doneSeq: 0, scopeKey: 'g' }, 0);
  b.react('idle', 10);
  b.update({ available: true, waiting: true, doneSeq: 0, scopeKey: 'g' }, 20);
  let v = b.view(30);
  assert.equal(v.state, 'waiting'); assert.equal(v.emotion, 'pleading'); assert.equal(v.bubble, 'notice');
  b.poke(40);
  v = b.view(50);
  assert.equal(v.trigger, 'pokeWaiting');
});

test('brain: click combo -> angry -> furious -> sulk, pat forgives', () => {
  const b = new PetBrain({ now: 0, random: () => 0.99 });
  b.update({ available: true, doneSeq: 0, scopeKey: 'g' }, 0);
  for (let i = 0; i < ANGRY_CLICKS; i++) b.poke(100 + i * 50);
  assert.equal(b.view(400).trigger, 'angry');
  for (let i = ANGRY_CLICKS; i < FURIOUS_CLICKS; i++) b.poke(100 + i * 50);
  assert.equal(b.view(500).trigger, 'furious');
  assert.equal(b.view(500).pose, 'furious');
  for (let i = FURIOUS_CLICKS; i < SULK_CLICKS; i++) b.poke(100 + i * 50);
  let v = b.view(600);
  assert.equal(v.trigger, 'sulk');
  b.poke(700);                                 // ignored while sulking
  assert.equal(b.view(750).trigger, 'sulk');
  b.pat(800);
  v = b.view(850);
  assert.equal(v.trigger, 'forgive'); assert.equal(v.emoji, EMOTIONS.thanks.emoji);
});

test('brain: double-clicks inside a fast combo still count toward her temper', () => {
  // Real browsers report rapid clicks/taps as click, dblclick, click, dblclick...
  const b = new PetBrain({ now: 0, random: () => 0.5 });
  b.update({ available: true, doneSeq: 0, scopeKey: 'g' }, 0);
  const seen = [];
  for (let i = 0; i < SULK_CLICKS; i++) {
    const t = 100 + i * 80;
    (i % 2 ? b.love(t) : b.poke(t));
    seen.push(b.view(t + 1).trigger);
  }
  assert.equal(seen[1], 'love');
  assert.equal(seen[ANGRY_CLICKS - 1], 'angry');
  assert.equal(seen[FURIOUS_CLICKS - 1], 'furious');
  assert.equal(seen[SULK_CLICKS - 1], 'sulk');
});

test('brain: slow clicks never get angry', () => {
  const b = new PetBrain({ now: 0, random: () => 0.5 });
  b.update({ available: true, doneSeq: 0, scopeKey: 'g' }, 0);
  for (let i = 0; i < 20; i++) b.poke(i * 3000);
  assert.notEqual(b.view(60000).trigger, 'angry');
});

test('brain: sleeping, waking and the never-sleep option', () => {
  const b = new PetBrain({ now: 0, random: () => 0, sleepAfterMs: 30000, chatter: false });
  b.update({ available: true, doneSeq: 0, scopeKey: 'g' }, 0);
  const v = b.view(31000);
  assert.equal(v.state, 'sleeping'); assert.equal(v.pose, 'sleepy'); assert.equal(v.fx, 'zzz');
  b.poke(31000);
  assert.equal(b.view(31100).trigger, 'wake');
  b.sleepAfterMs = 0;
  assert.equal(b.view(10e6).state, 'resting');
});

test('brain: drag holds a pose, panics when shaken, then drops', () => {
  const b = new PetBrain({ now: 0, random: () => 0 });
  b.update({ available: true, doneSeq: 0, scopeKey: 'g' }, 0);
  b.dragStart(10);
  assert.equal(b.view(5000).dragging, true);   // no timeout while held
  b.dragSpeed(5, 5000);
  assert.equal(b.view(5000).emotion, 'panic');
  b.dragSpeed(0.1, 6000);
  assert.equal(b.view(6000).emotion, 'carried');
  b.dragEnd(6100);
  const v = b.view(6200);
  assert.equal(v.dragging, false); assert.equal(v.trigger, 'drop');
});

test('brain: idle chatter only while resting', () => {
  const b = new PetBrain({ now: 0, random: () => 0, sleepAfterMs: 0 });
  b.update({ available: true, working: true, workingCount: 1, doneSeq: 0, scopeKey: 'g' }, 0);
  b.tick(200000);
  assert.notEqual(b.view(200001).trigger, 'idle');
  b.update({ available: true, doneSeq: 0, scopeKey: 'g' }, 200002);
  b.tick(400000);
  assert.equal(b.view(400001).trigger, 'idle');
});

test('preferences and position are sanitised', () => {
  assert.deepEqual(cleanPreferences({ scale: 99, sleepAfterMs: 7, language: 'xx', scope: 'current' }).scale, 1.8);
  assert.equal(cleanPreferences({ sleepAfterMs: 7 }).sleepAfterMs, 120000);
  assert.equal(cleanPreferences({ sleepAfterMs: 0 }).sleepAfterMs, 0);
  assert.equal(cleanPreferences(null).language, 'auto');
  assert.deepEqual(clampPosition(-50, -50, 100, 100, 800, 600, 56), { x: 8, y: 56 });
  assert.deepEqual(clampPosition(5000, 5000, 100, 100, 800, 600), { x: 692, y: 492 });
});

test('language: explicit wins, Turkish browser beats DSH English', () => {
  assert.equal(resolveLanguage('en', 'zh-CN', 'tr-TR'), 'en');
  assert.equal(resolveLanguage('auto', 'en', 'tr-TR'), 'tr');
  assert.equal(resolveLanguage('auto', 'zh-CN', 'tr-TR'), 'zh');
  assert.equal(resolveLanguage('auto', 'en', 'de-DE'), 'en');
});
