import { PetWidget } from './widget.js';
import { SessionTracker } from './state.js';

/**
 * The only file that knows DSH's client contract:
 *  - `shell.overlay` slot (a list slot: additive, click-through by default)
 *  - its standard props `useSessions` / `useSessionStatus`
 *  - services `slots`, `connection`, `locale`
 * No private DOM, no extra network, no Host code.
 */
export function readDshLocale(locale) {
  try { return locale?.getSnapshot?.().active || 'en'; } catch { return 'en'; }
}

export function observeDshLocale(locale, onLocale) {
  let alive = true, previous;
  const publish = () => {
    if (!alive) return;
    const next = readDshLocale(locale);
    if (next !== previous) { previous = next; onLocale(next); }
  };
  const unsubscribe = locale?.subscribe?.(publish) || (() => {});
  publish();
  return () => { if (alive) { alive = false; unsubscribe(); } };
}

/** The session the user is looking at: the one retained by the main view. */
export function selectedSessionId(catalog) {
  return Object.values(catalog?.byId || {}).find(row => (row?.retainedBy?.mainView ?? 0) > 0)?.id;
}

function connectionState(connection) {
  try { return connection?.state?.getSnapshot?.(); } catch { return undefined; }
}

/** Wire catalog/status/connection changes into the widget. Kept outside React for testing. */
export function connectPet(ctx, widget, getProjection) {
  const tracker = new SessionTracker();
  let alive = true;
  const publish = () => {
    if (!alive) return;
    const { catalog, statuses } = getProjection();
    widget.update(tracker.update({
      catalog, statuses,
      currentSessionId: selectedSessionId(catalog),
      scope: widget.preferences.scope,
      connected: connectionState(ctx.connection) === 'connected',
    }));
  };
  publish();
  let stop = () => {};
  try { stop = ctx.connection?.state?.subscribe?.(publish) || stop; } catch { /* still works without live connection events */ }
  return { publish, dispose() { if (alive) { alive = false; stop(); } } };
}

let greeted = false;   // one "hello" per page load, not per remount

export function createPlugin(require, media, css) {
  const React = require('react');
  const h = React.createElement;
  return {
    inject: ['slots', 'connection', 'locale'],
    apply(ctx) {
      function usePet(onScopeChange) {
        const element = React.useRef(null);
        const widget = React.useRef(null);
        const scopeChange = React.useRef(onScopeChange);
        scopeChange.current = onScopeChange;
        React.useEffect(() => {
          const instance = new PetWidget(element.current, {
            media, css, dshLocale: readDshLocale(ctx.locale), greet: !greeted,
            onScopeChange: scope => scopeChange.current?.(scope),
          });
          greeted = true;
          widget.current = instance;
          let stopLocale = () => {};
          try { stopLocale = observeDshLocale(ctx.locale, locale => instance.setDshLocale(locale)); } catch { /* English fallback */ }
          return () => { stopLocale(); instance.dispose(); if (widget.current === instance) widget.current = null; };
        }, []);
        return [element, widget];
      }
      /** Fallback when the slot gives no session hooks: still a cute, interactive pet. */
      function QuietPet() {
        const [element] = usePet();
        return h('div', { ref: element, 'data-deepseek-chan': 'quiet' });
      }
      function ConnectedPet({ useSessions, useSessionStatus }) {
        const catalog = useSessions(snapshot => snapshot);
        const statuses = useSessionStatus(map => map);
        const latest = React.useRef({ catalog, statuses });
        latest.current = { catalog, statuses };
        const controller = React.useRef(null);
        const push = () => controller.current?.publish();
        const [element, widget] = usePet(push);
        React.useEffect(() => {
          const connection = connectPet(ctx, widget.current, () => latest.current);
          controller.current = connection;
          return () => { connection.dispose(); if (controller.current === connection) controller.current = null; };
        }, []);
        React.useEffect(push, [catalog, statuses]);
        return h('div', { ref: element, 'data-deepseek-chan': 'connected' });
      }
      class Boundary extends React.Component {
        constructor(props) { super(props); this.state = { failed: false }; }
        static getDerivedStateFromError() { return { failed: true }; }
        render() { return this.state.failed ? h(QuietPet) : this.props.children; }
      }
      function PetRoot(props) {
        const supported = typeof props.useSessions === 'function' && typeof props.useSessionStatus === 'function';
        return h(Boundary, null, supported ? h(ConnectedPet, props) : h(QuietPet));
      }
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'deepseek-chan-pet', order: 91, label: 'DeepSeek-chan',
      }, PetRoot));
    },
  };
}
