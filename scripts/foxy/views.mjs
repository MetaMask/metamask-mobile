// Maps a screen name (the route the app reports for a request) to the source that defines it, so the dashboard
// can link "Launched from" to the right file and line on GitHub. Static analysis only: nothing runs in the app.
//
//   <Stack.Screen name={Routes.WALLET.HOME} component={Wallet} />
//        |                |                                |
//        |                |                                +--> where `Wallet` is defined (follows imports and re-exports)
//        |                +-- Routes.ts: 'WalletTabHome'
//        +-- where the screen is registered (always known, used when the component cannot be resolved)
//
// Screens are also found when a navigator builds them from config objects, such as the bottom tabs:
//
//   { key: 'home', name: Routes.WALLET.HOME }      useHomeTabDefinitions.ts   (key -> screen name)
//   const TAB_COMPONENTS = { home: WalletTabStackFlow }   MainNavigator.tsx   (key -> component)
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve, relative } from 'node:path';

const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js'];
const INDEXES = ['index.tsx', 'index.ts', 'index.jsx', 'index.js'];
const MAX_FOLLOW = 5; // re-export hops before giving up
const MAX_WRAPPERS = 3; // `const X = wrap(Y)` hops before giving up

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const read = (file) => { try { return readFileSync(file, 'utf8'); } catch { return null; } };
const isFile = (file) => { try { return statSync(file).isFile(); } catch { return false; } };

/** `Routes.ts` constants: nested `KEY: { INNER: 'value' }` -> Map('WALLET.HOME' -> 'WalletTabHome'). */
export function parseRoutes(text) {
  const out = new Map(), stack = [];
  let inside = false;
  for (const line of text.split('\n')) {
    if (!inside) { if (/\bRoutes\s*(?::[^=]+)?=\s*\{/.test(line)) inside = true; continue; }
    const open = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*\{\s*(?:\/\/.*)?$/);
    const value = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(['"])([^'"]*)\2/);
    if (open) stack.push(open[1]);
    else if (value) out.set([...stack, value[1]].join('.'), value[3]);
    else if (/^\s*\}/.test(line)) { if (!stack.length) break; stack.pop(); }
  }
  return out;
}

/** Text of the JSX opening tag that starts at `start` (`<` of `<X.Screen`), balancing braces so arrows inside props do not end it. */
function readTag(text, start) {
  let depth = 0, quote = null;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth <= 0 && text[i - 1] !== '=') return text.slice(start, i + 1);
  }
  return text.slice(start, start + 600);
}

/** Every `<Something.Screen name=… component=…>` in a file. */
export function findRegistrations(text, routes) {
  const out = [];
  for (const m of text.matchAll(/<[A-Za-z_$][\w$]*\.Screen\b/g)) {
    const tag = readTag(text, m.index);
    const nameAttr = tag.match(/\bname=(?:\{\s*([^}]+?)\s*\}|"([^"]*)"|'([^']*)')/);
    if (!nameAttr) continue;
    let name = nameAttr[2] ?? nameAttr[3];
    if (name == null) {
      const expr = nameAttr[1].replace(/\s+as\s+\w+\s*$/, '');
      const literal = expr.match(/^(['"`])([^'"`$]*)\1$/);
      name = literal ? literal[2] : routes.get(expr.replace(/^Routes\./, ''));
    }
    if (!name) continue;
    const comp = tag.match(/\bcomponent=\{\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/);
    out.push({ name, component: comp ? comp[1] : null, line: lineOf(text, m.index) });
  }
  return out;
}

/** Local bindings from import statements: name -> { spec, imported }, where imported is 'default' or the exported name. */
export function parseImports(text) {
  const out = new Map();
  for (const m of text.matchAll(/import\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const [, clause, spec] = m;
    const named = clause.match(/\{([\s\S]*)\}/);
    const rest = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, ' ').trim();
    if (rest && !rest.startsWith('*')) out.set(rest.split(/\s+/)[0], { spec, imported: 'default' });
    const ns = rest.match(/\*\s+as\s+(\w+)/);
    if (ns) out.set(ns[1], { spec, imported: '*' });
    if (named) {
      for (const part of named[1].split(',')) {
        const p = part.trim().replace(/^type\s+/, ''); if (!p) continue;
        const [imported, local] = p.split(/\s+as\s+/);
        out.set((local || imported).trim(), { spec, imported: imported.trim() });
      }
    }
  }
  return out;
}

/** The line where `name` is declared as a const / function / class (exported or not). */
export function findDefinition(text, name) {
  const m = text.match(new RegExp(`^[ \\t]*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?(?:const|let|var|function\\*?|class)\\s+${escapeRe(name)}\\b`, 'm'));
  return m ? lineOf(text, m.index) : null;
}

// A quote only opens a string where one can start (after `(`, `:`, `,`, `=` and so on), so an apostrophe in JSX text
// such as "Don't" is not mistaken for one.
const STRING_START = /^$|[(:,[{=?&|+!;]/;

/** Every `{ … }` in a file as offsets. Strings, template literals and comments are skipped. */
export function objectSpans(text) {
  const spans = [], open = [];
  let quote = null, lineComment = false, blockComment = false, prev = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (c === '\\') i++; else if (c === quote) { quote = null; prev = c; } continue; }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === '`' || (c === "'" && STRING_START.test(prev))) { quote = c; continue; }
    if (!/\s/.test(c)) prev = c;
    if (c === '{') open.push(i);
    else if (c === '}' && open.length) spans.push({ start: open.pop(), end: i });
  }
  return spans;
}

/** Splits an object body on the commas that sit at its top level (not inside brackets or strings). */
function topLevelSegments(body) {
  const out = [];
  let depth = 0, quote = null, start = 0, prev = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) { quote = null; prev = c; } continue; }
    if (c === '"' || c === '`' || (c === "'" && STRING_START.test(prev))) { quote = c; continue; }
    if (!/\s/.test(c)) prev = c;
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { out.push({ text: body.slice(start, i), index: start }); start = i + 1; }
  }
  out.push({ text: body.slice(start), index: start });
  return out.filter((s) => s.text.trim());
}

/** The `key: value` entries of an object, with the offset of each entry. Shorthand, spreads and methods are skipped. */
export function objectEntries(text, span) {
  const entries = [];
  for (const seg of topLevelSegments(text.slice(span.start + 1, span.end))) {
    const m = seg.text.match(/^(\s*)([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")\s*:\s*([\s\S]*?)\s*$/);
    if (!m) continue;
    entries.push({ key: m[2].replace(/^['"]|['"]$/g, ''), value: m[3], offset: span.start + 1 + seg.index + m[1].length });
  }
  return entries;
}

/** `Routes.WALLET.HOME` or `'Browser'` -> the screen name, or null when the value is anything else. */
function screenNameOf(value, routes) {
  const route = value.match(/^Routes\.([\w.]+)$/);
  if (route) return routes.get(route[1]) ?? null;
  const literal = value.match(/^(['"])([^'"]*)\1$/);
  return literal ? literal[2] : null;
}

/**
 * For a component that is a navigator (`<X.Navigator initialRouteName={'WalletView'}>`), the screen it opens first:
 * the `<X.Screen name="WalletView" component={…}>` registered in the same file, resolved to its component.
 */
function initialScreen({ file, line }, routes, resolver, root) {
  const text = read(file); if (!text) return null;
  const head = text.split('\n').slice(line - 1, line + 80).join('\n');
  const initial = head.match(/initialRouteName=\{\s*(?:(['"])([^'"]+)\1|Routes\.([\w.]+))\s*\}/);
  if (!initial) return null;
  const name = initial[2] ?? routes.get(initial[3]);
  const reg = name && findRegistrations(text, routes).find((r) => r.name === name && r.component);
  if (!reg) return null;
  const found = resolver.component(file, text, reg.component);
  if (!found) return null;
  return { name, component: reg.component, file: found.file, line: found.line, registeredIn: { file: relative(root, file), line: reg.line } };
}

/** Route name -> { component, file, line, registeredIn: { file, line } }.
 * `file` / `line` is where the screen's component is defined, or its registration when that cannot be resolved.
 * @param {string} root repository root
 * @param {{ files?: string[] }} [options] files (relative to root) to scan instead of asking git
 */
export function buildViewIndex(root, options = {}) {
  const routesText = read(join(root, 'app', 'constants', 'navigation', 'Routes.ts')) ?? '';
  const routes = parseRoutes(routesText);
  const resolver = createResolver(root);
  const index = {};
  const add = (name, entry) => {
    const prev = index[name];
    if (!prev || (!prev.resolved && entry.resolved)) index[name] = entry; // the first registration wins unless a later one resolves
  };

  const sources = [];
  for (const rel of options.files ?? candidateFiles(root)) {
    const file = join(root, rel), text = read(file);
    if (text != null) sources.push({ rel, file, text });
  }

  // 1. JSX: <Stack.Screen name={…} component={…} />
  for (const src of sources) {
    for (const reg of findRegistrations(src.text, routes)) {
      const registeredIn = { file: src.rel, line: reg.line };
      const found = resolver.component(src.file, src.text, reg.component);
      add(reg.name, { component: reg.component, registeredIn, ...(found ? { file: relative(root, found.file), line: found.line } : registeredIn), resolved: Boolean(found) });
    }
  }

  // 2. Config objects. `{ key: 'home', name: Routes.WALLET.HOME }` names the screen for a key; a map such as
  //    `{ home: WalletTabStackFlow }` gives the component for the same key. Joined on the key, and only when unambiguous.
  const namesByKey = new Map(); // key -> Map(screen name -> { file, offset })
  const componentMaps = [];
  for (const src of sources) {
    for (const span of objectSpans(src.text)) {
      const entries = objectEntries(src.text, span);
      const key = entries.find((e) => e.key === 'key' && /^(['"])[^'"]*\1$/.test(e.value));
      const nameEntry = entries.find((e) => e.key === 'name');
      if (key && nameEntry) {
        const name = screenNameOf(nameEntry.value, routes);
        if (!name) continue;
        const k = key.value.slice(1, -1);
        if (!namesByKey.has(k)) namesByKey.set(k, new Map());
        if (!namesByKey.get(k).has(name)) namesByKey.get(k).set(name, true);
        continue;
      }
      const isComponentMap = entries.length >= 2 && entries.every((e) => /^[A-Za-z_$][\w$.]*$|^[A-Za-z_$][\w$.]*\(\s*[A-Za-z_$][\w$.]*\s*\)$/.test(e.value));
      if (isComponentMap) for (const e of entries) componentMaps.push({ key: e.key, value: e.value, offset: e.offset, src });
    }
  }
  for (const map of componentMaps) {
    const names = namesByKey.get(map.key);
    if (!names || names.size !== 1) continue;
    const [name] = names.keys();
    const component = map.value.match(/\(\s*([A-Za-z_$][\w$.]*)\s*\)$/)?.[1] ?? map.value;
    const registeredIn = { file: map.src.rel, line: lineOf(map.src.text, map.offset) };
    let found = resolver.component(map.src.file, map.src.text, component);
    // A tab can be a stack: its visible screen is the one named by `initialRouteName`, so link to that.
    const first = found && initialScreen(found, routes, resolver, root);
    if (first) { add(first.name, { component: first.component, registeredIn: first.registeredIn, file: relative(root, first.file), line: first.line, resolved: true }); found = first; }
    add(name, { component, registeredIn, ...(found ? { file: relative(root, found.file), line: found.line } : registeredIn), resolved: Boolean(found) });
  }
  return index;
}

/** git knows which files exist, including ones not yet committed; a missing git just means no index. */
function candidateFiles(root) {
  try {
    const out = execFileSync('git', ['-C', root, 'grep', '--untracked', '-l', '-E', '[.]Screen|name: *Routes[.]', '--', 'app', ':(exclude)*.test.*', ':(exclude)*.stories.*', ':(exclude)*.snap'], { encoding: 'utf8', timeout: 10000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean);
  } catch { return []; }
}

const SOURCE_FILE = /\.(tsx|ts|jsx|js)$/;
const NOT_A_VIEW = /(\.test\.|\.stories\.|\.styles\.|\.types\.|\.constants\.|\/__mocks__\/|\/__snapshots__\/|\/testUtils\/)/;

function listAppFiles(root) {
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard', '--', 'app'], { encoding: 'utf8', timeout: 10000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter((f) => SOURCE_FILE.test(f) && !NOT_A_VIEW.test(f));
  } catch { return []; }
}

/** Last resort for screens registered dynamically (from a config list): a file or folder named after the route. */
export function guessByName(root, files, route) {
  const hits = files.filter((f) => {
    const parts = f.split('/'), base = parts.pop().replace(SOURCE_FILE, '');
    return base === route || (base === 'index' && parts[parts.length - 1] === route);
  }).sort((a, b) => a.length - b.length);
  if (!hits.length) return null;
  const file = hits[0], text = read(join(root, file)) ?? '';
  return { component: route, file, line: findDefinition(text, route) ?? 1, registeredIn: null, resolved: true, guess: true };
}

/** Looks routes up, rebuilding the index at most every `ttlMs` so line numbers follow edits made while Foxy runs. */
export function createViewIndexer(root, { ttlMs = 15000 } = {}) {
  let at = 0, index = {}, files = [];
  const refresh = () => {
    if (at && Date.now() - at < ttlMs) return;
    try { index = buildViewIndex(root); files = listAppFiles(root); } catch { index = {}; files = []; }
    at = Date.now();
  };
  return { get(route) { refresh(); return index[route] ?? guessByName(root, files, route); } };
}

export function createResolver(root) {
  const alias = (spec) => (spec.startsWith('#app/') ? join(root, 'app', spec.slice(5)) : null);
  /** Import specifier -> file on disk (relative paths and the #app alias; packages return null). */
  function resolveSpec(fromFile, spec) {
    const base = spec.startsWith('.') ? resolve(dirname(fromFile), spec) : alias(spec);
    if (!base) return null;
    for (const ext of EXTENSIONS) if (isFile(base + ext)) return base + ext;
    for (const index of INDEXES) if (isFile(join(base, index))) return join(base, index);
    return null;
  }

  /** Where `name` (or the default export) of `file` is defined, following re-exports. */
  function locate(file, name, hops = 0) {
    const text = read(file); if (text == null || hops > MAX_FOLLOW) return null;
    const here = (line) => ({ file, line });
    if (name === 'default') {
      const direct = text.match(/^[ \t]*export\s+default\s+(?:async\s+)?(?:function\*?|class)\s*(\w+)?/m);
      if (direct) return here(lineOf(text, direct.index));
      const asDefault = text.match(/export\s*\{[^}]*?\b(\w+)\s+as\s+default\b[^}]*\}(?!\s*from)/);
      if (asDefault) { const line = findDefinition(text, asDefault[1]); if (line) return here(line); }
      const reexport = text.match(/export\s*\{\s*default(?:\s+as\s+\w+)?\s*(?:,[^}]*)?\}\s*from\s*['"]([^'"]+)['"]/);
      if (reexport) { const next = resolveSpec(file, reexport[1]); const found = next && locate(next, 'default', hops + 1); if (found) return found; }
      const renamed = text.match(/export\s*\{[^}]*\b(\w+)\s+as\s+default\b[^}]*\}\s*from\s*['"]([^'"]+)['"]/);
      if (renamed) { const next = resolveSpec(file, renamed[2]); const found = next && locate(next, renamed[1], hops + 1); if (found) return found; }
      const expr = text.match(/^[ \t]*export\s+default\s+([^;]+?);?[ \t]*$/m);
      if (expr) {
        const ids = [...expr[1].matchAll(/[A-Za-z_$][\w$]*/g)].map((x) => x[0]);
        const ordered = [...ids.filter((i) => /^[A-Z]/.test(i)).reverse(), ...ids.filter((i) => !/^[A-Z]/.test(i)).reverse()];
        for (const id of ordered) { const line = findDefinition(text, id); if (line) return here(line); }
        return here(lineOf(text, expr.index));
      }
      return null;
    }
    const line = findDefinition(text, name);
    if (line) return here(line);
    for (const m of text.matchAll(/export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      for (const part of m[1].split(',')) {
        const [orig, exported] = part.trim().split(/\s+as\s+/);
        if ((exported || orig)?.trim() !== name) continue;
        const next = resolveSpec(file, m[2]); const found = next && locate(next, orig.trim(), hops + 1);
        if (found) return found;
      }
    }
    for (const m of text.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
      const next = resolveSpec(file, m[1]); const found = next && locate(next, name, hops + 1);
      if (found) return found;
    }
    return null;
  }

  /** Where the component named in a `<Screen component={…}>` of `file` lives. Follows `const X = wrap(Y)` to Y. */
  function component(file, text, ident, wrappers = 0) {
    if (!ident) return null;
    const [head, ...members] = ident.split('.');
    const imp = parseImports(text).get(head);
    if (!imp) {
      const line = findDefinition(text, head);
      if (!line) return null;
      const inner = text.split('\n')[line - 1].match(/=\s*[A-Za-z_$][\w$.]*\(\s*([A-Za-z_$][\w$]*)\b/);
      if (inner && inner[1] !== head && wrappers < MAX_WRAPPERS) {
        const found = component(file, text, inner[1], wrappers + 1);
        if (found) return found;
      }
      return { file, line };
    }
    const target = resolveSpec(file, imp.spec); if (!target) return null;
    return locate(target, imp.imported === '*' ? members[0] || 'default' : imp.imported);
  }
  return { resolveSpec, locate, component };
}
