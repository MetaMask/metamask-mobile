/* eslint-disable import-x/no-commonjs */
// TEMP full-program tracing instrumentation (Remove before merge).
//
// Wraps EVERY function with entry/exit calls so we get a complete, tracing
// (not sampling) profile — 100% of calls, including work on resolved-Promise
// microtasks that the Hermes sampling profiler misses.
//
// Enabled only when JSTRACE=1 is set for the Metro/Babel process, so normal
// builds are untouched.
//
// Emits a flat event stream at runtime via a global `__jt(phase, id)` hook
// (installed by app/.../jstrace-runtime.ts). We DON'T keep an explicit push/pop
// stack in the plugin because async/await + generators suspend across
// microtasks and would corrupt a strict stack; instead every enter/exit is an
// independent timestamped event and the tree is rebuilt offline into
// Speedscope's evented format.
//
// Design notes / gotchas handled:
//  - Arrow functions with expression bodies are converted to block bodies first.
//  - Class constructors are SKIPPED (can't inject before super()).
//  - Generators/async are wrapped with try/finally — durations include suspend
//    gaps (accepted: uniformly inflated), events stay independent so no stack
//    corruption.
//  - The tracer runtime, SES/lockdown, and Metro polyfills are never
//    instrumented (would recurse or crash boot).

// DENYLIST mode (default): instrument EVERYTHING except the paths below.
// These MUST stay excluded — instrumenting them crashes boot (they run before
// global.__jt exists), recurses through our own runtime, or breaks framework
// semantics (React reconciler / Redux internals / RN bridge) that our try/finally
// wrap disturbs. The old allowlist implicitly protected these; now we name them.
const EXCLUDE = [
  // Our own tracer + lockdown/SES + boot polyfills (must run before __jt exists).
  '/jstrace', // our runtime + this plugin's targets
  '/ses.cjs',
  '/ses-hermes.cjs',
  'react-native-lockdown',
  '/polyfills/',
  '/expo/virtual/',
  '@babel/runtime',
  '/metro-runtime/',
  'react-refresh',
  '/@react-native/js-polyfills/',
  'InitializeCore',
  // Framework internals: extremely hot, would swamp the trace and can recurse or
  // break scheduler/reconciler timing. We still SEE their instrumented callers.
  '/node_modules/react/',
  '/node_modules/react-dom/',
  '/node_modules/react-native/Libraries/',
  '/node_modules/react-native/Renderer/',
  '/node_modules/scheduler/',
  '/node_modules/react-refresh/',
  '/node_modules/@react-native/',
  '/node_modules/regenerator-runtime/',
  '/node_modules/metro',
  '/node_modules/event-target-shim/',
  '/node_modules/promise/',
  '/node_modules/hermes-',
  // Reanimated worklets are serialized and shipped to a SEPARATE UI-thread
  // runtime where global.__jt does not exist; wrapping their bodies breaks
  // worklet creation ("Failed to create a worklet"). Never instrument them.
  '/node_modules/react-native-reanimated/',
  '/node_modules/react-native-gesture-handler/',
  '/node_modules/react-native-worklets/',
  // Pure measurement contamination — these ONLY run because a profiler/DevTools
  // is attached (or because a logger is serializing objects) and do NOT exist in
  // a release build. Instrumenting them swamps the trace with tens of ms of
  // fake, non-shippable cost (overrideMethod, shouldFilterFiber, pretty-format
  // printer, debug logger, etc.).
  '/node_modules/react-devtools-core/',
  '/node_modules/react-devtools-shared/',
  '/node_modules/pretty-format/',
  '/node_modules/debug/',
];

// Optional ALLOWLIST override: if JSTRACE_INCLUDE="a,b,c" is set, revert to the
// old focused behaviour (only matching files are instrumented). Empty/unset =>
// denylist mode (instrument everything not in EXCLUDE).
const INCLUDE = (process.env.JSTRACE_INCLUDE
  ? process.env.JSTRACE_INCLUDE.split(',').map((s) => s.trim()).filter(Boolean)
  : []);

const posix = (f) => (f ? f.replace(/\\/g, '/') : '');

module.exports = function jstrace({ types: t }) {
  // A per-file name registry is unnecessary: we pass a string literal name at
  // each call site. The offline converter interns them.
  const makeName = (fnName, filename, line) => {
    const short = posix(filename).split('/node_modules/').pop();
    return `${fnName}@${short}:${line}`;
  };

  const shouldSkipFile = (filename) => {
    const f = posix(filename);
    if (EXCLUDE.some((e) => f.includes(e))) return true;
    // Allowlist override: only when JSTRACE_INCLUDE is set do we skip
    // non-matching files. Otherwise (denylist mode) instrument everything else.
    if (INCLUDE.length && !INCLUDE.some((e) => f.includes(e))) return true;
    return false;
  };

  const wrapBody = (path, name) => {
    const body = path.get('body');

    // Arrow with expression body -> block body returning the expression.
    if (!body.isBlockStatement()) {
      body.replaceWith(
        t.blockStatement([t.returnStatement(body.node)]),
      );
    }

    const enter = t.expressionStatement(
      t.logicalExpression(
        '&&',
        t.memberExpression(t.identifier('global'), t.identifier('__jt')),
        t.callExpression(
          t.memberExpression(t.identifier('global'), t.identifier('__jt')),
          [t.numericLiteral(0), t.stringLiteral(name)],
        ),
      ),
    );
    const exit = t.expressionStatement(
      t.logicalExpression(
        '&&',
        t.memberExpression(t.identifier('global'), t.identifier('__jt')),
        t.callExpression(
          t.memberExpression(t.identifier('global'), t.identifier('__jt')),
          [t.numericLiteral(1), t.stringLiteral(name)],
        ),
      ),
    );

    const inner = path.node.body.body;
    const tryStmt = t.tryStatement(
      t.blockStatement(inner),
      null,
      t.blockStatement([exit]),
    );
    path.get('body').replaceWith(t.blockStatement([enter, tryStmt]));
  };

  const fnName = (path) => {
    if (path.node.id && path.node.id.name) return path.node.id.name;
    const p = path.parent;
    if (t.isVariableDeclarator(p) && p.id && p.id.name) return p.id.name;
    if (t.isObjectProperty(p) && p.key && p.key.name) return p.key.name;
    if (t.isClassMethod(path.node) && path.node.key && path.node.key.name)
      return path.node.key.name;
    if (t.isAssignmentExpression(p) && p.left && p.left.property)
      return p.left.property.name || 'anon';
    return 'anon';
  };

  // A worklet is a function shipped to Reanimated's separate UI-thread runtime,
  // where `global.__jt` does not exist — instrumenting it breaks worklet
  // creation ("Failed to create a worklet"). Worklets are marked by a
  // `'worklet';` string directive at the top of the function body. Detect that
  // directive so we skip worklets ANYWHERE (app code + libs), not just the
  // path-excluded node_modules.
  const isWorklet = (path) => {
    const body = path.node.body;
    if (!body) return false;
    // Normal case: parsed directive prologue `'worklet';`.
    if (
      Array.isArray(body.directives) &&
      body.directives.some((d) => d.value && d.value.value === 'worklet')
    ) {
      return true;
    }
    // Belt-and-suspenders: a leading `'worklet';` that survived as a plain
    // string-literal ExpressionStatement instead of a parsed directive.
    if (Array.isArray(body.body) && body.body.length) {
      const first = body.body[0];
      if (
        t.isExpressionStatement(first) &&
        t.isStringLiteral(first.expression) &&
        first.expression.value === 'worklet'
      ) {
        return true;
      }
    }
    return false;
  };

  const visitFn = (path, state) => {
    if (path.node.__jtDone) return;
    // Skip class constructors (super() must run first).
    if (t.isClassMethod(path.node) && path.node.kind === 'constructor') return;
    // Skip worklets (see isWorklet) — wrapping breaks the UI-thread runtime.
    if (isWorklet(path)) return;
    // Skip generators — try/finally around a yielding body is fragile and rare
    // enough not to matter for the churn we care about.
    if (path.node.generator) return;
    // Skip getters/setters — wrapping changes accessor semantics.
    if (
      (t.isClassMethod(path.node) || t.isObjectMethod(path.node)) &&
      (path.node.kind === 'get' || path.node.kind === 'set')
    ) {
      return;
    }
    const line =
      (path.node.loc && path.node.loc.start && path.node.loc.start.line) || 0;
    const name = makeName(fnName(path), state.filename || '?', line);
    path.node.__jtDone = true;
    wrapBody(path, name);
  };

  // Decide once per file whether WE instrument it. NEVER call path.stop() —
  // that aborts the shared Babel traversal for ALL plugins/presets on this
  // file, which was suppressing babel-preset-expo's Flow/TS type-stripping and
  // sending raw `type X = ...` syntax to Hermes (the "';' expected" crash).
  const active = (state) =>
    process.env.JSTRACE === '1' && !shouldSkipFile(state.filename || '');

  return {
    name: 'jstrace-instrument',
    visitor: {
      FunctionDeclaration(path, state) {
        if (active(state)) visitFn(path, state);
      },
      FunctionExpression(path, state) {
        if (active(state)) visitFn(path, state);
      },
      ArrowFunctionExpression(path, state) {
        if (active(state)) visitFn(path, state);
      },
      ClassMethod(path, state) {
        if (active(state)) visitFn(path, state);
      },
      ObjectMethod(path, state) {
        if (active(state)) visitFn(path, state);
      },
    },
  };
};
