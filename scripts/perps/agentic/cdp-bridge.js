#!/usr/bin/env node
/* eslint-disable no-undef, import-x/no-extraneous-dependencies */
/**
 * CDP Bridge — Connect to the running MetaMask app via Hermes Chrome DevTools Protocol.
 *
 * Usage:
 *   node scripts/perps/agentic/cdp-bridge.js navigate PerpsMarketListView
 *   node scripts/perps/agentic/cdp-bridge.js get-route
 *   node scripts/perps/agentic/cdp-bridge.js get-state "engine.backgroundState.NetworkController"
 *   node scripts/perps/agentic/cdp-bridge.js eval "1+1"
 *
 * Environment:
 *   WATCHER_PORT  Metro port (default: 8081, read from .js.env if present)
 *   CDP_TIMEOUT   Connection timeout in ms (default: 5000)
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const PRE_CONDITIONS = require('./lib/registry');
const { loadPort } = require('./lib/config');
const { discoverTarget } = require('./lib/target-discovery');
const { createWSClient } = require('./lib/ws-client');
const { cdpEval, cdpEvalAsync } = require('./lib/cdp-eval');
const { checkAssert } = require('./lib/assert');

async function evalSpec(client, entry, params) {
  const expr = typeof entry.expression === 'function' ? entry.expression(params) : entry.expression;
  let raw = entry.async
    ? await cdpEvalAsync(client, expr)
    : await cdpEval(client, expr);
  if (raw === undefined || raw === null) raw = 'null';
  if (typeof raw !== 'string') raw = JSON.stringify(raw);
  return raw;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

// Map of nested route names to their parent navigator.
// Friendly aliases → actual route names (for developer convenience)
const ROUTE_ALIASES = {
  PerpsHomeView: 'PerpsMarketListView',
};

// When navigating to a nested route, we need: navigate('Parent', { screen: 'Child', params })
// Routes not in this map are assumed to be root-level and navigated to directly.
const NESTED_ROUTE_PARENTS = {
  // Perps
  PerpsMarketListView: 'Perps', PerpsMarketDetails: 'Perps', PerpsPositions: 'Perps',
  PerpsTrendingView: 'Perps', PerpsWithdraw: 'Perps', PerpsTutorial: 'Perps', PerpsOrderRedirect: 'Perps',
  PerpsClosePosition: 'Perps', PerpsTPSL: 'Perps', PerpsAdjustMargin: 'Perps',
  PerpsOrderDetailsView: 'Perps', PerpsActivity: 'Perps', PerpsOrderBook: 'Perps',
  PerpsPnlHeroCard: 'Perps', PerpsHIP3Debug: 'Perps',
  PerpsSelectModifyAction: 'Perps', PerpsSelectAdjustMarginAction: 'Perps',
  PerpsSelectOrderType: 'Perps', PerpsTradingView: 'Perps',
  // Predict
  PredictMarketList: 'Predict', PredictMarketDetails: 'Predict',
  PredictActivityDetail: 'Predict',
  // Bridge
  BridgeView: 'Bridge', BridgeTokenSelector: 'Bridge',
  BridgeTransactionDetails: 'Bridge',
  // Staking
  Stake: 'Staking', StakeConfirmation: 'Staking', Unstake: 'Staking',
  UnstakeConfirmation: 'Staking', EarningsHistory: 'Staking', Claim: 'Staking',
  // Earn
  EarnLendingDepositConfirmation: 'EarnScreens',
  EarnLendingWithdrawalConfirmation: 'EarnScreens',
  // Card
  CardHome: 'CardScreens', CardWelcome: 'CardScreens', CardAuthentication: 'CardScreens',
  // Settings (nested under Settings root)
  ContactsSettings: 'Settings', SecuritySettings: 'Settings',
  AdvancedSettings: 'Settings', ExperimentalSettings: 'Settings',
  DeveloperOptions: 'Settings', NotificationsSettings: 'Settings',
};

const COMMANDS = {
  async navigate(client, args, { deviceName, platform } = {}) {
    const routeName = ROUTE_ALIASES[args[0]] || args[0];
    if (!routeName) {
      throw new Error('Usage: navigate <RouteName> [params-json]');
    }
    let params = {};
    if (args[1]) {
      try {
        params = JSON.parse(args[1]);
      } catch (e) {
        throw new Error(`Invalid params JSON: ${e.message}`);
      }
    }

    // Capture route before navigation
    const previousRoute = await cdpEval(client, 'globalThis.__AGENTIC__?.getRoute()');

    let expr;
    const parent = NESTED_ROUTE_PARENTS[routeName];
    if (parent) {
      // Nested route: navigate('Parent', { screen: 'Child', params: {...} })
      const navParams = Object.keys(params).length > 0
        ? JSON.stringify({ screen: routeName, params })
        : JSON.stringify({ screen: routeName });
      expr = `globalThis.__AGENTIC__?.navigate(${JSON.stringify(parent)}, ${navParams})`;
    } else {
      // Root-level route: navigate('Route', params)
      const paramsStr = JSON.stringify(params);
      expr = `globalThis.__AGENTIC__?.navigate(${JSON.stringify(routeName)}, ${paramsStr})`;
    }

    await cdpEval(client, expr);
    // Small delay for navigation to settle, then return current route
    await new Promise((r) => setTimeout(r, 500));
    const currentRoute = await cdpEval(
      client,
      'globalThis.__AGENTIC__?.getRoute()',
    );
    return { navigated: routeName, params, previousRoute, currentRoute, deviceName, platform };
  },

  async 'get-route'(client) {
    const route = await cdpEval(
      client,
      'globalThis.__AGENTIC__?.getRoute()',
    );
    return route;
  },

  async 'get-state'(client, args) {
    const path = args[0] || '';
    if (!path) {
      // Return navigation state
      const state = await cdpEval(
        client,
        'globalThis?.__AGENTIC__?.getState()',
      );
      return state;
    }
    // Access Redux store at the given dot-path
    const expr = `(() => {
      const store = globalThis?.store;
      if (!store) return { error: 'Redux store not found on globalThis.store' };
      const state = store.getState();
      const parts = ${JSON.stringify(path)}.split('.');
      let current = state;
      for (const p of parts) {
        if (current == null) return undefined;
        current = current[p];
      }
      return current;
    })()`;
    return await cdpEval(client, expr);
  },

  async eval(client, args) {
    const expression = args.join(' ');
    if (!expression) {
      throw new Error('Usage: eval <expression>');
    }
    return await cdpEval(client, expression);
  },

  async 'eval-async'(client, args) {
    const expression = args.join(' ');
    if (!expression) {
      throw new Error('Usage: eval-async <expression>');
    }
    return await cdpEvalAsync(client, expression);
  },

  async 'can-go-back'(client) {
    return await cdpEval(client, 'globalThis.__AGENTIC__?.canGoBack()');
  },

  async 'go-back'(client, _args, { deviceName, platform } = {}) {
    await cdpEval(client, 'globalThis.__AGENTIC__?.goBack()');
    await new Promise((r) => setTimeout(r, 300));
    const route = await cdpEval(
      client,
      'globalThis.__AGENTIC__?.getRoute()',
    );
    return { currentRoute: route, deviceName, platform };
  },

  async status(client, _args, { deviceName, platform } = {}) {
    const expr = `(function() {
      var route = globalThis.__AGENTIC__?.getRoute() || null;
      var account = null;
      try { account = globalThis.__AGENTIC__?.getSelectedAccount() || null; } catch(e) {}
      return { route: route, account: account };
    })()`;
    const snapshot = await cdpEval(client, expr);
    return { ...snapshot, deviceName: deviceName || '', platform: platform || '' };
  },

  async 'list-accounts'(client) {
    return await cdpEval(client, 'globalThis.__AGENTIC__?.listAccounts()');
  },

  async 'get-selected-account'(client) {
    return await cdpEval(client, 'globalThis.__AGENTIC__?.getSelectedAccount()');
  },

  async 'switch-account'(client, args) {
    const address = args[0];
    if (!address) {
      throw new Error('Usage: switch-account <address>');
    }
    return await cdpEval(client, `globalThis.__AGENTIC__?.switchAccount(${JSON.stringify(address)})`);
  },

  async 'press-test-id'(client, args, { deviceName } = {}) {
    const testId = args[0];
    if (!testId) {
      throw new Error('Usage: press-test-id <testId>');
    }
    // Try __AGENTIC__ bridge first, fall back to inline fiber walking
    const expr = `(function() {
      if (globalThis.__AGENTIC__?.pressTestId) return globalThis.__AGENTIC__.pressTestId(${JSON.stringify(testId)});
      var hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook) return { ok: false, error: 'No React DevTools hook' };
      var renderers = hook.renderers;
      if (!renderers) return { ok: false, error: 'No renderers' };
      var getFiberRoots = hook.getFiberRoots;
      function walk(fiber) {
        if (!fiber) return false;
        var props = fiber.memoizedProps;
        if (props && props.testID === ${JSON.stringify(testId)}) {
          if (typeof props.onPress === 'function') { props.onPress(); return true; }
        }
        return walk(fiber.child) || walk(fiber.sibling);
      }
      for (var [id] of renderers) {
        var roots = getFiberRoots ? getFiberRoots(id) : undefined;
        if (!roots) continue;
        var found = false;
        roots.forEach(function(r) { if (!found) found = walk(r.current); });
        if (found) return { ok: true, testId: ${JSON.stringify(testId)} };
      }
      return { ok: false, error: 'No component with testID=' + ${JSON.stringify(testId)} + ' found or no onPress' };
    })()`;
    const result = await cdpEval(client, expr);
    return { ...result, testId, deviceName };
  },

  async 'scroll-view'(client, args, { deviceName } = {}) {
    let testId;
    let offset = 300;
    let animated = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--test-id' && i + 1 < args.length) {
        testId = args[++i];
      } else if (args[i] === '--offset' && i + 1 < args.length) {
        offset = Number(args[++i]);
      } else if (args[i] === '--animated') {
        animated = true;
      } else if (args[i] === '--no-animated') {
        animated = false;
      }
    }
    const optsJson = JSON.stringify({ testId, offset, animated });
    // Try __AGENTIC__ bridge first, fall back to inline fiber walking
    const expr = `(function() {
      if (globalThis.__AGENTIC__?.scrollView) return globalThis.__AGENTIC__.scrollView(${optsJson});
      var hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook) return { ok: false, error: 'No React DevTools hook' };
      var renderers = hook.renderers;
      if (!renderers) return { ok: false, error: 'No renderers' };
      var getFiberRoots = hook.getFiberRoots;
      var opts = ${optsJson};
      function tryScroll(fiber, walkSiblings) {
        if (walkSiblings === undefined) walkSiblings = true;
        var current = fiber;
        while (current) {
          var sn = current.stateNode;
          if (sn) {
            if (typeof sn.scrollTo === 'function') { sn.scrollTo({ y: opts.offset, animated: opts.animated }); return true; }
            if (typeof sn.scrollToOffset === 'function') { sn.scrollToOffset({ offset: opts.offset, animated: opts.animated }); return true; }
          }
          if (tryScroll(current.child)) return true;
          current = walkSiblings ? current.sibling : null;
        }
        return false;
      }
      function findTestId(fiber) {
        if (!fiber) return null;
        var props = fiber.memoizedProps;
        if (props && props.testID === opts.testId) return fiber;
        return findTestId(fiber.child) || findTestId(fiber.sibling);
      }
      for (var [id] of renderers) {
        var roots = getFiberRoots ? getFiberRoots(id) : undefined;
        if (!roots) continue;
        var scrolled = false;
        roots.forEach(function(r) {
          if (scrolled) return;
          if (opts.testId) {
            var anchor = findTestId(r.current);
            if (anchor) scrolled = tryScroll(anchor, false);
          } else {
            scrolled = tryScroll(r.current);
          }
        });
        if (scrolled) return { ok: true, testId: opts.testId, offset: opts.offset, animated: opts.animated };
      }
      return { ok: false, error: opts.testId ? 'No scrollable near testID=' + opts.testId : 'No scrollable found' };
    })()`;
    const result = await cdpEval(client, expr);
    return { ...result, deviceName };
  },

  async 'set-input'(client, args, { deviceName } = {}) {
    const testId = args[0];
    const value = args.slice(1).join(' ');
    if (!testId) {
      throw new Error('Usage: set-input <testId> <value>');
    }
    // Try __AGENTIC__ bridge first, fall back to inline fiber walking
    const expr = `(function() {
      if (globalThis.__AGENTIC__?.setInput) return globalThis.__AGENTIC__.setInput(${JSON.stringify(testId)}, ${JSON.stringify(value)});
      var hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook) return { ok: false, error: 'No React DevTools hook' };
      var renderers = hook.renderers;
      if (!renderers) return { ok: false, error: 'No renderers' };
      var getFiberRoots = hook.getFiberRoots;
      function findByTestId(fiber) {
        if (!fiber) return null;
        var props = fiber.memoizedProps;
        if (props && props.testID === ${JSON.stringify(testId)}) return fiber;
        return findByTestId(fiber.child) || findByTestId(fiber.sibling);
      }
      for (var [id] of renderers) {
        var roots = getFiberRoots ? getFiberRoots(id) : undefined;
        if (!roots) continue;
        var result = null;
        roots.forEach(function(r) {
          if (result) return;
          var fiber = findByTestId(r.current);
          if (!fiber) return;
          var cur = fiber;
          while (cur) {
            if (cur.memoizedProps && typeof cur.memoizedProps.onChangeText === 'function') {
              cur.memoizedProps.onChangeText(${JSON.stringify(value)});
              result = { ok: true, testId: ${JSON.stringify(testId)}, value: ${JSON.stringify(value)} };
              return;
            }
            cur = cur.return || null;
          }
        });
        if (result) return result;
      }
      return { ok: false, error: 'No component with testID=' + ${JSON.stringify(testId)} + ' found or no onChangeText' };
    })()`;
    const result = await cdpEval(client, expr);
    return { ...result, testId, value, deviceName };
  },

  async 'sentry-debug'(client, args, { deviceName } = {}) {
    const action = args[0] || 'enable';
    if (action === 'enable') {
      const expr = `(function() {
        try {
          var sentryHub = globalThis.__SENTRY__;
          if (!sentryHub) return { ok: false, error: 'globalThis.__SENTRY__ not found' };
          var ver = Object.keys(sentryHub).filter(function(k) { return /^[0-9]/.test(k); })[0];
          if (!ver) return { ok: false, error: 'No Sentry version key found in __SENTRY__' };
          var hub = sentryHub[ver];
          var scope = hub.defaultCurrentScope;
          if (!scope) return { ok: false, error: 'No defaultCurrentScope in Sentry hub' };
          var sentryClient = scope.getClient();
          if (!sentryClient) return { ok: false, error: 'No Sentry client found via scope.getClient()' };

          if (sentryClient.__agenticPatched) return { ok: true, alreadyPatched: true, version: ver };

          var origException = sentryClient.captureException.bind(sentryClient);
          var origMessage = sentryClient.captureMessage.bind(sentryClient);

          sentryClient.captureException = function(err, hint, currentScope) {
            var msg = err && err.message ? err.message : String(err);
            console.warn('[SENTRY-DEBUG] captureException:', msg);
            if (err && err.stack) console.warn('[SENTRY-DEBUG] stack:', err.stack);
            return origException(err, hint, currentScope);
          };
          sentryClient.captureMessage = function(msg, level, hint, currentScope) {
            console.warn('[SENTRY-DEBUG] captureMessage:', msg);
            return origMessage(msg, level, hint, currentScope);
          };
          sentryClient.__agenticPatched = true;
          sentryClient.__agenticOrigException = origException;
          sentryClient.__agenticOrigMessage = origMessage;
          return { ok: true, patched: true, version: ver };
        } catch(e) {
          return { ok: false, error: String(e) };
        }
      })()`;
      return await cdpEval(client, expr);
    } else if (action === 'disable') {
      const expr = `(function() {
        try {
          var sentryHub = globalThis.__SENTRY__;
          if (!sentryHub) return { ok: true, wasNotPatched: true };
          var ver = Object.keys(sentryHub).filter(function(k) { return /^[0-9]/.test(k); })[0];
          if (!ver) return { ok: true, wasNotPatched: true };
          var hub = sentryHub[ver];
          var scope = hub.defaultCurrentScope;
          if (!scope) return { ok: true, wasNotPatched: true };
          var sentryClient = scope.getClient();
          if (!sentryClient || !sentryClient.__agenticPatched) return { ok: true, wasNotPatched: true };
          sentryClient.captureException = sentryClient.__agenticOrigException;
          sentryClient.captureMessage = sentryClient.__agenticOrigMessage;
          delete sentryClient.__agenticPatched;
          delete sentryClient.__agenticOrigException;
          delete sentryClient.__agenticOrigMessage;
          return { ok: true, unpatched: true, version: ver };
        } catch(e) {
          return { ok: false, error: String(e) };
        }
      })()`;
      return await cdpEval(client, expr);
    }
    throw new Error('Usage: sentry-debug [enable|disable]');
  },

  async unlock(client, args, { deviceName } = {}) {
    const password = args[0];
    if (!password) {
      throw new Error('Usage: unlock <password>');
    }
    const escapedPw = JSON.stringify(password);

    // Fiber-tree walker snippet reused in both phases
    const fiberWalker = `
      var hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook) return { ok: false, error: 'No React DevTools hook' };
      var renderers = hook.renderers;
      if (!renderers) return { ok: false, error: 'No renderers' };
      var getFiberRoots = hook.getFiberRoots;
      function walkFiber(fiber, testId) {
        if (!fiber) return null;
        var props = fiber.memoizedProps;
        if (props && props.testID === testId) return fiber;
        var found = walkFiber(fiber.child, testId);
        if (found) return found;
        return walkFiber(fiber.sibling, testId);
      }`;

    // Phase 1: inject password via onChangeText
    const injectExpr = `(function() {
      ${fiberWalker}
      var password = ${escapedPw};
      for (var [id] of renderers) {
        var roots = getFiberRoots ? getFiberRoots(id) : undefined;
        if (!roots) continue;
        var injected = false;
        roots.forEach(function(root) {
          if (injected) return;
          var input = walkFiber(root.current, 'login-password-input');
          if (input && input.memoizedProps && typeof input.memoizedProps.onChangeText === 'function') {
            input.memoizedProps.onChangeText(password);
            injected = true;
          }
        });
        if (injected) return { ok: true, phase: 'inject' };
      }
      return { ok: false, error: 'login-password-input not found' };
    })()`;

    const injectResult = await cdpEval(client, injectExpr);
    if (!injectResult?.ok) {
      return { ok: false, error: injectResult?.error || 'Password injection failed', deviceName };
    }

    // Wait for React to re-render so useCallback picks up the new password
    await new Promise((r) => setTimeout(r, 600));

    // Phase 2: walk the fiber tree AGAIN to get the updated onPress callback
    const pressExpr = `(function() {
      ${fiberWalker}
      for (var [id] of renderers) {
        var roots = getFiberRoots ? getFiberRoots(id) : undefined;
        if (!roots) continue;
        var pressed = false;
        roots.forEach(function(root) {
          if (pressed) return;
          var btn = walkFiber(root.current, 'log-in-button');
          if (btn && btn.memoizedProps && typeof btn.memoizedProps.onPress === 'function') {
            btn.memoizedProps.onPress();
            pressed = true;
          }
        });
        if (pressed) return { ok: true, phase: 'press' };
      }
      return { ok: false, error: 'log-in-button not found' };
    })()`;

    const pressResult = await cdpEval(client, pressExpr);
    return {
      ok: pressResult?.ok ?? false,
      injected: true,
      pressed: pressResult?.ok ?? false,
      error: pressResult?.error,
      deviceName,
    };
  },

  async 'check-pre-conditions'(client, args) {
    const specsJson = args[0];
    if (!specsJson) throw new Error('Usage: check-pre-conditions <specs-json>');

    let specs;
    try {
      specs = JSON.parse(specsJson);
    } catch (e) {
      throw new Error(`Invalid specs JSON: ${e.message}`);
    }
    if (!Array.isArray(specs) || specs.length === 0) return { ok: true, checked: 0 };

    const failures = [];

    for (const spec of specs) {
      const name = typeof spec === 'string' ? spec : spec.name;
      const params = typeof spec === 'object' ? spec : {};
      const entry = PRE_CONDITIONS[name];

      if (!entry) {
        failures.push({ name, error: `Unknown pre-condition "${name}". Check pre-conditions.js for valid names.` });
        continue;
      }

      let raw;
      try {
        raw = await evalSpec(client, entry, params);
      } catch (e) {
        failures.push({ name, description: entry.description, error: `Eval failed: ${e.message}`, hint: entry.hint });
        continue;
      }

      const passed = checkAssert(raw, entry.assert);
      if (!passed) {
        failures.push({ name, description: entry.description, got: raw, hint: entry.hint });
      }
    }

    const ok = failures.length === 0;
    return { ok, checked: specs.length, failures: ok ? [] : failures };
  },

  async 'show-step'(client, args) {
    const stepId = args[0] || '';
    const description = args.slice(1).join(' ');
    const payload = JSON.stringify({ id: stepId, description });
    await cdpEval(client, `globalThis.__AGENTIC__?.showStep && globalThis.__AGENTIC__.showStep(${payload})`);
    return { ok: true };
  },

  async 'hide-step'(client) {
    await cdpEval(client, `globalThis.__AGENTIC__?.hideStep && globalThis.__AGENTIC__.hideStep()`);
    return { ok: true };
  },

  async 'profiler-start'(client) {
    // Hermes CDP exposes the sampling profiler via the Profiler domain.
    // Output of Profiler.stop is a Chrome-compatible .cpuprofile object.
    // Note: Hermes does NOT implement Profiler.enable (returns -32601 Unsupported);
    // Profiler.start/stop work without it.
    await client.send('Profiler.start');
    return { ok: true, started: true };
  },

  async 'profiler-stop'(client, args) {
    let outPath = '';
    let label = 'trace';
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--out' && i + 1 < args.length) {
        outPath = args[++i];
      } else if (args[i] === '--label' && i + 1 < args.length) {
        label = args[++i];
      }
    }
    const res = await client.send('Profiler.stop', {}, 60000);
    const profile = res?.profile;
    if (!profile) {
      return { ok: false, error: 'Profiler.stop returned no profile' };
    }
    const serialized = JSON.stringify(profile);
    if (!outPath) {
      const tracesDir = path.resolve(process.env.APP_ROOT || process.cwd(), 'temp/agentic/recipes/test-artifacts/traces');
      fs.mkdirSync(tracesDir, { recursive: true });
      outPath = path.join(tracesDir, `trace-${label}.cpuprofile`);
    } else {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
    }
    fs.writeFileSync(outPath, serialized);
    const nodesCount = Array.isArray(profile.nodes) ? profile.nodes.length : 0;
    const samplesCount = Array.isArray(profile.samples) ? profile.samples.length : 0;
    return {
      ok: true,
      path: outPath,
      label,
      sizeBytes: Buffer.byteLength(serialized, 'utf8'),
      nodesCount,
      samplesCount,
      startTime: profile.startTime ?? null,
      endTime: profile.endTime ?? null,
    };
  },

  async 'eval-ref'(client, args) {
    const arg = args[0];
    if (!arg || arg === '--help') {
      console.error('Usage: eval-ref <team/name> | eval-ref --list');
      process.exit(1);
    }

    const teamsDir = path.resolve(__dirname, 'teams');

    if (arg === '--list') {
      return listEvalRefs(teamsDir);
    }

    // Parse "team/name" (2-part) or "team/subfile/name" (3-part)
    const parts = arg.split('/');
    if (parts.length < 2 || parts.length > 3) {
      throw new Error('Eval ref must be "team/name" or "team/subfile/name" (e.g. perps/positions or perps/core/pump-market)');
    }
    let evalFile, evalName;
    if (parts.length === 3) {
      const [team, subfile, name] = parts;
      evalFile = path.join(teamsDir, team, 'evals', `${subfile}.json`);
      evalName = name;
    } else {
      const [team, name] = parts;
      evalFile = path.join(teamsDir, team, 'evals.json');
      evalName = name;
    }
    if (!fs.existsSync(evalFile)) {
      throw new Error(`No eval file found: ${path.relative(path.dirname(teamsDir), evalFile)}`);
    }
    const evals = JSON.parse(fs.readFileSync(evalFile, 'utf8'));
    const entry = evals[evalName];
    if (!entry) {
      const available = Object.keys(evals).join(', ');
      throw new Error(`Eval ref "${evalName}" not found. Available: ${available}`);
    }

    const raw = entry.async
      ? await cdpEvalAsync(client, entry.expression)
      : await cdpEval(client, entry.expression);
    // Eval expressions typically JSON.stringify their result.
    // Parse it so main()'s JSON.stringify produces clean output
    // instead of double-encoded strings.
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { /* not JSON — return as-is */ }
    }
    return raw;
  },
};

// ---------------------------------------------------------------------------
// Eval-ref helpers
// ---------------------------------------------------------------------------

/** List all eval refs from teams/<team>/evals.json and teams/<team>/evals/*.json */
function listEvalRefs(teamsDir) {
  const all = {};
  const teamDirs = fs.readdirSync(teamsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  // Top-level evals: teams/<team>/evals.json → keyed as <team>
  for (const team of teamDirs) {
    const f = path.join(teamsDir, team, 'evals.json');
    if (fs.existsSync(f)) {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      all[team] = Object.fromEntries(
        Object.entries(data).map(([name, r]) => [name, r.description || ''])
      );
    }
  }
  // Sub-collections: teams/<team>/evals/<file>.json → keyed as <team>/<file>
  for (const team of teamDirs) {
    const evalsDir = path.join(teamsDir, team, 'evals');
    if (!fs.existsSync(evalsDir)) continue;
    const subFiles = fs.readdirSync(evalsDir).filter((f) => f.endsWith('.json'));
    for (const file of subFiles) {
      const key = `${team}/${path.basename(file, '.json')}`;
      const data = JSON.parse(fs.readFileSync(path.join(evalsDir, file), 'utf8'));
      all[key] = Object.fromEntries(
        Object.entries(data).map(([name, r]) => [name, r.description || ''])
      );
    }
  }
  return all;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`CDP Bridge — interact with the running MetaMask app via Hermes CDP

Usage:
  node scripts/perps/agentic/cdp-bridge.js <command> [args...]

Commands:
  navigate <RouteName> [params-json]   Navigate to a screen
  status                               Route + selected account snapshot
  get-route                            Get current route name and params
  get-state [dot.path]                 Get Redux state (or nav state if no path)
  eval <expression>                    Evaluate arbitrary JS in app context
  eval-async <expression>              Evaluate async/Promise expression
  can-go-back                          Check if navigation can go back
  go-back                              Navigate back
  list-accounts                        List all accounts
  get-selected-account                 Get the currently selected account
  switch-account <address>             Switch to account by address
  press-test-id <testId>               Press a component by its testID prop
  scroll-view [--test-id <id>] [--offset <n>] [--animated]
                                       Scroll a ScrollView/FlatList
  set-input <testId> <value>           Set text input value by testID (calls onChangeText)
  sentry-debug [enable|disable]          Patch Sentry to log errors to console with [SENTRY-DEBUG] prefix
  unlock <password>                      Unlock wallet (inject password + press login button via fiber tree)
  eval-ref <team/name>                 Run an eval ref (e.g. perps/positions)
  eval-ref --list                      List all available eval refs
  profiler-start                       Start Hermes sampling profiler
  profiler-stop [--out <path>] [--label <name>]
                                       Stop profiler, dump Chrome-compatible
                                       .cpuprofile to <path> (default:
                                       temp/agentic/recipes/test-artifacts/traces/trace-<label>.cpuprofile)

Environment:
  WATCHER_PORT    Metro port (default: 8081)
  CDP_TIMEOUT     Connection timeout in ms (default: 5000)
  IOS_SIMULATOR   Filter targets by iOS simulator name
  ANDROID_DEVICE  Filter targets by Android device/emulator serial`);
    process.exit(0);
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error(`Available: ${Object.keys(COMMANDS).join(', ')}`);
    process.exit(1);
  }

  // `eval-ref --list` only reads local JSON files — skip CDP connection entirely.
  if (command === 'eval-ref' && args[1] === '--list') {
    const result = await handler(null, args.slice(1), {});
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const port = loadPort();
  const timeout = Number.parseInt(process.env.CDP_TIMEOUT || '5000', 10);

  // `status` probes ALL connected targets so both platforms are visible.
  if (command === 'status') {
    const { discoverAllTargets } = require('./lib/target-discovery');
    const allTargets = await discoverAllTargets(port);
    const results = [];
    for (const target of allTargets) {
      let client;
      try {
        client = await createWSClient(target.wsUrl, timeout);
        const platform = await cdpEval(client, 'globalThis.__AGENTIC__?.platform') || '';
        const result = await handler(client, args.slice(1), { deviceName: target.deviceName, platform });
        results.push(result);
      } catch {
        // Target not responsive — skip
      } finally {
        if (client) client.close();
      }
    }
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
    return;
  }

  const { wsUrl, deviceName } = await discoverTarget(port);
  const client = await createWSClient(wsUrl, timeout);

  try {
    // Detect platform from the running app (exposed by __AGENTIC__ bridge as Platform.OS)
    const platform = await cdpEval(client, 'globalThis.__AGENTIC__?.platform') || '';
    const result = await handler(client, args.slice(1), { deviceName, platform });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
