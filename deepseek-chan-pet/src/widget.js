import { PetBrain, cleanPreferences, clampPosition, STORAGE_KEY, MIN_SCALE, MAX_SCALE } from './state.js';
import { resolveLanguage, translate } from './i18n.js';
import { lineText } from './dialogue.js';

const BASE_SIZE = 170;
const TYPE_MS = 26;
const CHEVRON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FX_GLYPHS = { sparkle: ['✦', '✧', '✦', '✧'], hearts: ['💙', '💗', '💙', '💗'], zzz: ['z', 'Z', 'z'], blush: ['♡', '♡', '♡'] };

/** Turn an embedded data: URI into a blob: URL so a video is decoded once, not re-parsed from a string. */
function toBlobUrl(dataUri) {
  try {
    const [head, body] = dataUri.split(',', 2);
    const mime = head.slice(5).split(';')[0];
    const bytes = Uint8Array.from(atob(body), c => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch { return dataUri; }
}

/**
 * Framework-free pet UI, shared by the DSH plugin and the offline preview.
 * Everything lives in a shadow root on `host`; nothing is appended to <body>.
 */
export class PetWidget {
  constructor(host, { media, css, storage, dshLocale = 'en', now = () => Date.now(), random = Math.random, onScopeChange = () => {}, greet = true } = {}) {
    this.host = host;
    this.media = media;
    this.now = now;
    this.onScopeChange = onScopeChange;
    this.cleanups = [];
    this.disposed = false;
    this.dshLocale = dshLocale;
    this.storage = storage;
    if (storage === undefined) { try { this.storage = window.localStorage; } catch { this.storage = null; } }
    let saved;
    try { saved = JSON.parse(this.storage?.getItem(STORAGE_KEY) || 'null'); } catch { /* corrupt storage is optional */ }
    this.preferences = cleanPreferences(saved);
    this.brain = new PetBrain({ now: now(), random, sleepAfterMs: this.preferences.sleepAfterMs, chatter: this.preferences.chatter });
    this.blobUrls = new Map();
    this.painted = {};
    this.flash = undefined;

    this.root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    this.root.replaceChildren();
    const sheet = document.createElement('style');
    sheet.textContent = css;
    this.root.append(sheet);
    const template = document.createElement('template');
    // Static markup only; every dynamic string is set through textContent.
    template.innerHTML = `
      <div class="pet" data-state="resting" data-bubble="hover">
        <div class="bubble" aria-hidden="true"><span class="bubble-text"></span></div>
        <button type="button" class="stage" aria-keyshortcuts="Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight">
          <span class="shadow"></span>
          <span class="body">
            <img class="sprite" alt="" draggable="false" />
            <video class="clip" muted playsinline loop preload="auto" disablepictureinpicture hidden></video>
          </span>
          <span class="fx" aria-hidden="true"></span>
          <span class="badge" aria-hidden="true"><span class="badge-emoji"></span></span>
          <span class="count" aria-hidden="true" hidden></span>
        </button>
      </div>
      <section class="panel" role="dialog" hidden>
        <div class="panel-head"><strong data-i18n="panel.title"></strong><button class="close" type="button" data-i18n-aria="panel.close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
        <p class="subtitle" data-i18n="panel.subtitle"></p>
        <div class="setting"><label for="ds-scope" data-i18n="setting.scope"></label><span class="select"><select id="ds-scope"><option value="global" data-i18n="setting.scopeGlobal"></option><option value="current" data-i18n="setting.scopeCurrent"></option></select>${CHEVRON}</span></div>
        <div class="setting"><label for="ds-size"><span data-i18n="setting.size"></span> <output class="size-value"></output></label><input id="ds-size" type="range" min="${MIN_SCALE * 100}" max="${MAX_SCALE * 100}" step="5" /></div>
        <div class="setting"><label for="ds-sleep" data-i18n="setting.sleep"></label><span class="select"><select id="ds-sleep"><option value="30000" data-i18n="time.30s"></option><option value="120000" data-i18n="time.2m"></option><option value="300000" data-i18n="time.5m"></option><option value="0" data-i18n="time.never"></option></select>${CHEVRON}</span></div>
        <div class="setting"><label for="ds-language" data-i18n="setting.language"></label><span class="select"><select id="ds-language"><option value="auto" data-i18n="setting.languageAuto"></option><option value="tr">Türkçe</option><option value="en">English</option><option value="zh">中文</option></select>${CHEVRON}</span></div>
        <div class="setting"><label for="ds-motion" data-i18n="setting.motion"></label><input id="ds-motion" type="checkbox" role="switch" /></div>
        <div class="setting"><label for="ds-chatter" data-i18n="setting.chatter"></label><input id="ds-chatter" type="checkbox" role="switch" /></div>
        <div class="setting"><label for="ds-wheel" data-i18n="setting.wheel"></label><input id="ds-wheel" type="checkbox" role="switch" /></div>
        <div class="panel-actions"><button class="action reset" type="button" data-i18n="action.reset"></button><button class="action hide" type="button" data-i18n="action.hide"></button></div>
      </section>
      <button class="restore" type="button" hidden data-i18n="action.restore"></button>`;
    this.root.append(template.content.cloneNode(true));
    const $ = selector => this.root.querySelector(selector);
    Object.assign(this, {
      pet: $('.pet'), stage: $('.stage'), body: $('.body'), sprite: $('.sprite'), clip: $('.clip'),
      bubble: $('.bubble'), bubbleText: $('.bubble-text'), badge: $('.badge'), badgeEmoji: $('.badge-emoji'),
      count: $('.count'), fx: $('.fx'), panel: $('.panel'), restore: $('.restore'),
      scope: $('#ds-scope'), range: $('#ds-size'), sleep: $('#ds-sleep'), language: $('#ds-language'),
      motion: $('#ds-motion'), chatter: $('#ds-chatter'), wheel: $('#ds-wheel'),
    });

    this.listen(this.sprite, 'load', () => this.layoutArt());
    this.listen(this.clip, 'loadedmetadata', () => this.layoutArt());
    this.listen(this.stage, 'pointerdown', e => this.pointerDown(e));
    this.listen(this.stage, 'pointermove', e => this.pointerMove(e));
    this.listen(this.stage, 'pointerup', e => this.pointerEnd(e));
    this.listen(this.stage, 'pointercancel', e => this.pointerEnd(e, true));
    this.listen(this.stage, 'lostpointercapture', e => { if (this.drag?.id === e.pointerId) this.pointerEnd(e, true); });
    // Middle button: stop the browser's autoscroll / Linux paste, then pat.
    this.listen(this.stage, 'mousedown', e => { if (e.button === 1) e.preventDefault(); });
    this.listen(this.stage, 'auxclick', e => { if (e.button === 1) { e.preventDefault(); this.act(t => this.brain.pat(t)); } });
    this.listen(this.stage, 'click', e => {
      if (this.suppressClick) { this.suppressClick = false; return; }
      if (e.detail === 0) { this.openPanel(); return; }          // keyboard Enter/Space
      // detail 2 is the second click of a double-click: that one says "love".
      this.act(t => (e.detail === 2 ? this.brain.love(t) : this.brain.poke(t)));
    });
    this.listen(this.stage, 'contextmenu', e => { e.preventDefault(); this.openPanel(); });
    this.listen(this.stage, 'wheel', e => this.wheelResize(e), { passive: false });
    this.listen(this.stage, 'keydown', e => {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!directions[e.key]) return;
      e.preventDefault();
      const [dx, dy] = directions[e.key]; const step = e.shiftKey ? 24 : 6;
      this.preferences.x = this.position.x + dx * step; this.preferences.y = this.position.y + dy * step;
      this.reposition(); this.save();
    });
    this.listen($('.close'), 'click', () => this.closePanel());
    this.listen(this.root, 'keydown', e => {
      if (e.key !== 'Escape' || this.panel.hidden) return;
      e.preventDefault(); e.stopPropagation(); this.closePanel();
    });
    this.listen(document, 'pointerdown', e => {
      if (!this.panel.hidden && !e.composedPath().includes(host)) this.closePanel(false);
    });
    this.listen(this.scope, 'change', () => {
      this.preferences.scope = this.scope.value === 'current' ? 'current' : 'global';
      this.save(); this.onScopeChange(this.preferences.scope); this.paint();
    });
    this.listen(this.range, 'input', () => { this.preferences.scale = Number(this.range.value) / 100; this.applyPreferences(); this.save(); });
    this.listen(this.sleep, 'change', () => { this.preferences.sleepAfterMs = Number(this.sleep.value); this.applyPreferences(); this.save(); });
    this.listen(this.language, 'change', () => { this.preferences.language = this.language.value; this.applyPreferences(); this.save(); });
    this.listen(this.motion, 'change', () => { this.preferences.motion = this.motion.checked; this.applyPreferences(); this.save(); });
    this.listen(this.chatter, 'change', () => { this.preferences.chatter = this.chatter.checked; this.applyPreferences(); this.save(); });
    this.listen(this.wheel, 'change', () => { this.preferences.wheelResize = this.wheel.checked; this.save(); });
    this.listen($('.reset'), 'click', () => { this.preferences.x = null; this.preferences.y = null; this.reposition(); this.save(); });
    this.listen($('.hide'), 'click', () => {
      this.preferences.hidden = true; this.closePanel(false); this.applyPreferences(); this.save(); this.restore.focus();
    });
    this.listen(this.restore, 'click', () => {
      this.preferences.hidden = false; this.applyPreferences(); this.save(); this.stage.focus();
      this.act(t => this.brain.react('hello', t));
    });
    this.listen(window, 'resize', () => this.reposition());
    this.listen(document, 'visibilitychange', () => this.applyVisibility());
    this.listen(window, 'storage', e => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      let next;
      try { next = cleanPreferences(JSON.parse(e.newValue || 'null')); } catch { return; }
      const scopeChanged = next.scope !== this.preferences.scope;
      this.preferences = next; this.applyPreferences();
      if (scopeChanged) this.onScopeChange(next.scope);
    });
    const timer = setInterval(() => {
      if (document.hidden || this.preferences.hidden) return;
      this.brain.tick(this.now()); this.paint();
    }, 250);
    this.cleanups.push(() => clearInterval(timer));
    this.applyPreferences();
    if (greet) {
      const hello = setTimeout(() => this.act(t => this.brain.react('hello', t)), 900);
      this.cleanups.push(() => clearTimeout(hello));
    }
  }

  listen(target, event, callback, options) {
    target.addEventListener(event, callback, options);
    this.cleanups.push(() => target.removeEventListener(event, callback, options));
  }
  act(fn) { if (this.disposed) return; fn(this.now()); this.paint(); }
  save() { try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.preferences)); } catch { /* storage denial never breaks the pet */ } }
  get size() { return BASE_SIZE * this.preferences.scale; }
  get lang() { return resolveLanguage(this.preferences.language, this.dshLocale, globalThis.navigator?.language); }

  setDshLocale(locale) {
    if (this.disposed) return;
    this.dshLocale = locale;
    this.applyLanguage();
  }
  applyLanguage() {
    const lang = this.lang;
    this.host.setAttribute('lang', lang);
    for (const el of this.root.querySelectorAll('[data-i18n]')) el.textContent = translate(lang, el.dataset.i18n);
    for (const el of this.root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', translate(lang, el.dataset.i18nAria));
    if (this.painted.lang !== lang) { this.painted.lang = lang; this.painted.label = undefined; }
    this.paint();
  }
  applyVisibility() {
    this.host.dataset.paused = String(document.hidden || this.preferences.hidden);
    if (document.hidden || this.preferences.hidden) this.clip.pause();
    else if (!this.clip.hidden) this.clip.play().catch(() => {});
  }
  applyPreferences() {
    const p = this.preferences;
    this.range.value = String(Math.round(p.scale * 100));
    this.root.querySelector('.size-value').textContent = `${this.range.value}%`;
    this.range.style.setProperty('--progress', `${(p.scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE) * 100}%`);
    this.scope.value = p.scope;
    this.sleep.value = String(p.sleepAfterMs);
    this.language.value = p.language;
    this.motion.checked = p.motion;
    this.chatter.checked = p.chatter;
    this.wheel.checked = p.wheelResize;
    this.brain.sleepAfterMs = p.sleepAfterMs;
    this.brain.chatter = p.chatter;
    this.host.dataset.motion = String(p.motion);
    this.pet.hidden = p.hidden;
    this.restore.hidden = !p.hidden;
    if (p.hidden) this.closePanel(false);
    this.applyVisibility();
    this.reposition();
    this.applyLanguage();
  }
  topClearance() {
    return Math.max(56, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dsh-frame-top-clearance')) || 0);
  }
  reposition() {
    const size = this.size;
    this.pet.style.width = `${size}px`; this.pet.style.height = `${size}px`;
    this.position = clampPosition(
      this.preferences.x ?? window.innerWidth - size - 28,
      this.preferences.y ?? window.innerHeight - size - 96,
      size, size, window.innerWidth, window.innerHeight, this.topClearance());
    this.pet.style.left = `${this.position.x}px`; this.pet.style.top = `${this.position.y}px`;
    this.layoutArt();
    if (!this.panel.hidden) this.positionPanel();
  }
  /** Measure the visible art inside the square stage so the badge sits on her top-right. */
  layoutArt() {
    if (this.disposed || !this.position) return;
    const size = this.size;
    const video = !this.clip.hidden;
    const w = video ? this.clip.videoWidth : this.sprite.naturalWidth;
    const h = video ? this.clip.videoHeight : this.sprite.naturalHeight;
    const ratio = w > 0 && h > 0 ? w / h : 1;
    const artW = Math.min(size, size * ratio), artH = Math.min(size, size / ratio);
    this.art = { left: (size - artW) / 2, top: size - artH, width: artW, height: artH };
    this.pet.style.setProperty('--art-left', `${this.art.left}px`);
    this.pet.style.setProperty('--art-top', `${this.art.top}px`);
    this.pet.style.setProperty('--art-width', `${artW}px`);
    this.pet.style.setProperty('--art-height', `${artH}px`);
    this.positionBubble();
  }
  positionBubble() {
    if (!this.art || this.preferences.hidden) return;
    const bw = this.bubble.offsetWidth, bh = this.bubble.offsetHeight;
    const centerX = this.position.x + this.art.left + this.art.width / 2;
    const artTop = this.position.y + this.art.top;
    let left = Math.min(window.innerWidth - bw - 8, Math.max(8, centerX - bw / 2));
    let top = artTop - bh - 18;
    let side = 'above';
    if (top < this.topClearance() - 40) { top = this.position.y + this.size + 14; side = 'below'; }
    this.bubble.style.left = `${left - this.position.x}px`;
    this.bubble.style.top = `${top - this.position.y}px`;
    this.bubble.style.setProperty('--tail-x', `${Math.min(bw - 22, Math.max(14, centerX - left))}px`);
    this.bubble.dataset.side = side;
  }
  positionPanel() {
    const width = this.panel.offsetWidth || 290, height = this.panel.offsetHeight || 420;
    const p = clampPosition(this.position.x + this.size / 2 - width / 2, this.position.y - height - 10,
      width, height, window.innerWidth, window.innerHeight, 12);
    this.panel.style.left = `${p.x}px`; this.panel.style.top = `${p.y}px`;
  }
  openPanel() { this.panel.hidden = false; this.positionPanel(); this.root.querySelector('.close').focus(); }
  closePanel(focus = true) { this.panel.hidden = true; if (focus) this.stage.focus(); }

  pointerDown(e) {
    if (e.button !== 0 || !e.isPrimary) return;
    this.suppressClick = false;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, originX: this.position.x, originY: this.position.y,
      moved: false, lastX: e.clientX, lastY: e.clientY, lastT: this.now(), swing: 0 };
    this.stage.setPointerCapture(e.pointerId);
  }
  pointerMove(e) {
    const drag = this.drag;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; this.act(t => this.brain.dragStart(t)); }
    if (!drag.moved) return;
    const t = this.now(), dt = Math.max(1, t - drag.lastT);
    const vx = (e.clientX - drag.lastX) / dt, vy = (e.clientY - drag.lastY) / dt;
    drag.lastX = e.clientX; drag.lastY = e.clientY; drag.lastT = t;
    // She hangs from the cursor: horizontal speed swings her like a pendulum.
    drag.swing = drag.swing * 0.8 + Math.max(-28, Math.min(28, -vx * 14)) * 0.2;
    this.pet.style.setProperty('--swing', `${drag.swing.toFixed(1)}deg`);
    this.brain.dragSpeed(Math.hypot(vx, vy), t);
    this.preferences.x = drag.originX + dx; this.preferences.y = drag.originY + dy;
    this.reposition(); this.paint();
  }
  pointerEnd(e, cancelled = false) {
    const drag = this.drag;
    if (!drag || drag.id !== e.pointerId) return;
    this.drag = null;
    this.suppressClick = drag.moved || cancelled;
    this.pet.style.setProperty('--swing', '0deg');
    if (drag.moved) {
      this.preferences.x = this.position.x; this.preferences.y = this.position.y; this.save();
      this.act(t => this.brain.dragEnd(t));
    }
    if (this.stage.hasPointerCapture?.(e.pointerId)) this.stage.releasePointerCapture(e.pointerId);
  }
  wheelResize(e) {
    if (!this.preferences.wheelResize) return;
    e.preventDefault();
    const step = Math.sign(e.deltaY) * Math.min(0.1, Math.abs(e.deltaY) / 600 + 0.03);
    const scale = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.preferences.scale - step)) * 100) / 100;
    if (scale === this.preferences.scale) return;
    this.preferences.scale = scale;
    this.applyPreferences();
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 300);
    this.brain.touch(this.now());
    this.flash = { text: translate(this.lang, 'pet.size', { size: Math.round(scale * 100) }), emoji: '🔍', until: this.now() + 1200, seq: (this.flash?.seq || 0) + 1 };
    this.paint();
  }

  update(snapshot) { if (!this.disposed) { this.brain.update(snapshot, this.now()); this.paint(); } }

  /** Resolve a pose to a video (if one was supplied) or a sprite. */
  mediaFor(pose) {
    const entry = this.media.videos[pose];
    if (entry) {
      if (!this.blobUrls.has(pose)) this.blobUrls.set(pose, toBlobUrl(entry));
      return { kind: 'video', src: this.blobUrls.get(pose) };
    }
    return { kind: 'image', src: this.media.sprites[pose] || this.media.sprites.idle };
  }
  showPose(pose) {
    const media = this.mediaFor(pose);
    if (media.kind === 'video') {
      if (this.clip.getAttribute('src') !== media.src) this.clip.src = media.src;
      this.clip.hidden = false; this.sprite.hidden = true;
      if (!document.hidden) this.clip.play().catch(() => {});
    } else {
      this.clip.pause(); this.clip.hidden = true; this.sprite.hidden = false;
      if (this.sprite.getAttribute('src') !== media.src) this.sprite.src = media.src;
    }
    // A little "pop" so pose swaps feel like an anime cut, not a glitch.
    if (this.preferences.motion && this.painted.pose !== undefined && this.body.animate) {
      this.body.animate([{ scale: '0.9', opacity: 0.6 }, { scale: '1.04', opacity: 1, offset: 0.6 }, { scale: '1' }], { duration: 260, easing: 'ease-out' });
    }
    this.layoutArt();
  }
  spawnFx(kind) {
    this.fx.replaceChildren();
    for (const [index, glyph] of (FX_GLYPHS[kind] || []).entries()) {
      const span = document.createElement('span');
      span.textContent = glyph;
      span.style.setProperty('--i', String(index));
      this.fx.append(span);
    }
  }
  typeText(text) {
    clearInterval(this.typer);
    const chars = Array.from(text);
    if (!this.preferences.motion || chars.length < 2) { this.bubbleText.textContent = text; this.positionBubble(); return; }
    let shown = 0;
    this.bubbleText.textContent = '';
    this.typer = setInterval(() => {
      shown = Math.min(chars.length, shown + 1);
      this.bubbleText.textContent = chars.slice(0, shown).join('');
      this.positionBubble();
      if (shown >= chars.length) clearInterval(this.typer);
    }, TYPE_MS);
  }
  paint() {
    if (this.disposed) return;
    const now = this.now();
    const view = this.brain.view(now);
    const flash = this.flash && now < this.flash.until ? this.flash : undefined;
    const lang = this.lang;
    const p = this.painted;
    if (p.pose !== view.pose) { this.showPose(view.pose); p.pose = view.pose; }
    const set = (key, value) => { if (this.pet.dataset[key] !== value) this.pet.dataset[key] = value; };
    set('state', view.state);
    set('anim', view.anim);
    set('bubble', flash ? 'notice' : view.bubble);
    set('dragging', String(view.dragging));
    set('badge', String(Boolean(flash) || view.bubble === 'notice' || ['working', 'waiting', 'sleeping'].includes(view.state)));
    if (p.fx !== view.fx) { this.spawnFx(view.fx); p.fx = view.fx; set('fx', view.fx || 'none'); }
    const emoji = flash ? flash.emoji : view.emoji;
    if (p.emoji !== emoji) {
      this.badgeEmoji.textContent = emoji;
      if (this.preferences.motion && this.badge.animate) this.badge.animate([{ scale: '0.2' }, { scale: '1.25', offset: 0.6 }, { scale: '1' }], { duration: 320, easing: 'ease-out' });
      p.emoji = emoji;
    }
    const text = flash ? flash.text : lineText(view.line, lang);
    const textKey = flash ? `flash:${flash.seq}` : `${view.line?.id}:${view.lineSeq}:${lang}`;
    if (p.text !== textKey) { p.text = textKey; this.typeText(text); }
    const count = view.workingCount > 1 ? `×${view.workingCount}` : '';
    if (p.count !== count) { this.count.textContent = count; this.count.hidden = !count; p.count = count; }
    const status = view.workingCount > 0 ? `${text} (${translate(lang, 'pet.working', { count: view.workingCount })})` : text;
    const label = translate(lang, 'pet.aria', { status });
    if (p.label !== label) { this.stage.setAttribute('aria-label', label); p.label = label; }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearInterval(this.typer); clearTimeout(this.saveTimer);
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
    this.clip.pause();
    for (const url of this.blobUrls.values()) if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    this.root.replaceChildren();
    delete this.host.dataset.paused; delete this.host.dataset.motion;
  }
}
