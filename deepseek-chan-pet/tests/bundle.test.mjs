import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));

test('build output registers one shell.overlay entry with the package id', () => {
  execFileSync(process.execPath, [new URL('tools/build.mjs', root).pathname], { stdio: 'pipe' });
  let registration;
  globalThis.window = { __ModuleLoader__: { load: r => { registration = r; } } };
  new Function(fs.readFileSync(new URL('lib/client.js', root), 'utf8'))();
  assert.equal(registration.id, pkg.name);
  const required = [];
  const plugin = registration.factory(name => { required.push(name); return { createElement() {}, useRef: () => ({}), useEffect() {}, Component: class {} }; });
  assert.deepEqual(required, ['react'], 'only React comes from the module table');
  assert.deepEqual(plugin.inject, ['slots', 'connection', 'locale']);
  const seen = [];
  plugin.apply({ slots: { inject: (key, fn) => { seen.push(key); fn(); }, register: options => seen.push(options.id) } });
  assert.deepEqual(seen, ['shell.overlay', 'deepseek-chan-pet']);
});

test('manifest, patch, locales and icon agree', () => {
  const patch = fs.readFileSync(new URL('cordis.patch.yml', root), 'utf8');
  assert.match(patch, /id: deepseek-chan-pet/);
  assert.match(patch, new RegExp(`name: ${pkg.name}`));
  for (const lang of ['en', 'tr', 'zh']) {
    const meta = JSON.parse(fs.readFileSync(new URL(`locale/${lang}.json`, root), 'utf8')).meta;
    assert.ok(meta.title && meta.description, lang);
  }
  const icon = fs.statSync(new URL('assets/icon.png', root));
  assert.ok(icon.size < 256 * 1024, 'DSH icons must stay under 256 KiB');
  for (const file of ['index.js', 'lib/client.js']) assert.ok(fs.existsSync(new URL(file, root)), file);
});
