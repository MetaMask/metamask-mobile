#!/usr/bin/env node
/* eslint-disable no-undef, import/no-extraneous-dependencies */
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

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a value from .js.env */
function loadEnvValue(key) {
  try {
    const envPath = path.resolve(__dirname, '../../../.js.env');
    const content = fs.readFileSync(envPath, 'utf8');
    // .js.env uses `export KEY="value"` (shell-sourceable format),
    // so we handle the optional `export` prefix and strip surrounding quotes.
    const match = content.match(new RegExp(`^(?:export\\s+)?${key}=(.+)$`, 'm'));
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    // .js.env may not exist — fall through to undefined
  }
  return undefined;
}

/** Read WATCHER_PORT from .js.env or env (default: 8081) */
function loadPort() {
  return Number.parseInt(process.env.WATCHER_PORT || loadEnvValue('WATCHER_PORT') || '8081', 10);
}

/** Read IOS_SIMULATOR name from .js.env or env (default: none — accept any device) */
function loadSimulatorName() {
  return process.env.IOS_SIMULATOR || loadEnvValue('IOS_SIMULATOR') || '';
}

/** Read ANDROID_DEVICE serial from .js.env or env (default: none — accept any device) */
function loadAndroidDevice() {
  return process.env.ANDROID_DEVICE || loadEnvValue('ANDROID_DEVICE') || '';
}

/** Fetch JSON from a URL (http only, no external deps) */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/**
 * Quick probe: connect to a CDP target, evaluate `__DEV__`, disconnect.
 * Returns true if __DEV__ is true, false otherwise.
 */
async function probeTarget(wsUrl) {
  try {
    const client = await createWSClient(wsUrl, 3000);
    try {
      const result = await client.send('Runtime.evaluate', {
        expression: '(function(){ return typeof globalThis.__AGENTIC__; })()',
        returnByValue: true,
        awaitPromise: false,
      });
      return result?.result?.value === 'object';
    } finally {
      client.close();
    }
  } catch {
    // Connection failed — target is not the right one
    return false;
  }
}

/**
 * Discover the Hermes CDP WebSocket URL from Metro's /json/list endpoint.
 *
 * Multi-simulator support:
 *   - When IOS_SIMULATOR is set, filters targets by deviceName
 *   - With Hermes bridgeless mode, there are multiple pages per device:
 *     page 1 = native C++ runtime, page 2+ = JS runtime (where __AGENTIC__ lives)
 *   - We probe candidates to find the one with __AGENTIC__ installed
 */
async function discoverTarget(port) {
  const listUrl = `http://localhost:${port}/json/list`;
  let targets;
  try {
    targets = await fetchJSON(listUrl);
  } catch (e) {
    throw new Error(
      `Cannot reach Metro at ${listUrl}. Is Metro running?\n  ${e.message}`,
    );
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error(`No debug targets found at ${listUrl}`);
  }

  // Filter to React Native / Hermes targets with a WebSocket URL
  let candidates = targets.filter(
    (t) =>
      t.webSocketDebuggerUrl &&
      t.title &&
      (/react/i.test(t.title) || /hermes/i.test(t.title)),
  );

  // Filter by device name if IOS_SIMULATOR is set
  const simName = loadSimulatorName();
  if (simName && candidates.length > 1) {
    const deviceFiltered = candidates.filter(
      (t) => t.deviceName === simName,
    );
    if (deviceFiltered.length > 0) {
      candidates = deviceFiltered;
    }
  }

  // Filter by device name if ANDROID_DEVICE is set
  const androidDevice = loadAndroidDevice();
  if (androidDevice && candidates.length > 1) {
    const deviceFiltered = candidates.filter(
      (t) => t.deviceName === androidDevice,
    );
    if (deviceFiltered.length > 0) {
      candidates = deviceFiltered;
    }
  }

  if (candidates.length === 0) {
    candidates = targets.filter((t) => t.webSocketDebuggerUrl);
  }

  if (candidates.length === 0) {
    throw new Error(
      `No suitable debug target found. Targets:\n${JSON.stringify(targets, null, 2)}`,
    );
  }

  // Sort by page number descending (JS runtime has higher page number than C++ native)
  candidates.sort((a, b) => {
    const aPage = Number.parseInt((a.id || '').split('-').pop() || '0', 10);
    const bPage = Number.parseInt((b.id || '').split('-').pop() || '0', 10);
    return bPage - aPage;
  });

  // Probe candidates to find the one with __AGENTIC__ installed (the JS runtime)
  for (const candidate of candidates) {
    const hasAgentic = await probeTarget(candidate.webSocketDebuggerUrl);
    if (hasAgentic) {
      return { wsUrl: candidate.webSocketDebuggerUrl, deviceName: candidate.deviceName || '' };
    }
  }

  // Fallback: return highest page number (most likely the JS runtime)
  return { wsUrl: candidates[0].webSocketDebuggerUrl, deviceName: candidates[0].deviceName || '' };
}

/**
 * Minimal CDP client using the built-in ws-like interface over raw WebSocket.
 * Node 22+ has a built-in WebSocket; for older versions we use the ws package
 * that ships with React Native / Metro dev dependencies.
 */
function createWSClient(wsUrl, timeout) {
  return new Promise((resolve, reject) => {
    let WebSocketImpl;
    // Node 22+ has globalThis.WebSocket
    if (typeof globalThis.WebSocket === 'function') {
      WebSocketImpl = globalThis.WebSocket;
    } else {
      try {
        // Dynamic require avoids depcheck static analysis — ws is an optional
        // fallback for Node < 22 which has no built-in WebSocket.
        const wsModule = 'ws';
        WebSocketImpl = require(wsModule);
      } catch {
        throw new Error(
          'WebSocket not available. Install "ws" package or use Node >= 22.',
        );
      }
    }

    const ws = new WebSocketImpl(wsUrl);
    let msgId = 0;
    const pending = new Map();

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`CDP connection timeout after ${timeout}ms`));
    }, timeout);

    ws.onopen = () => {
      clearTimeout(timer);
      resolve({
        /** Send a CDP command and wait for the response */
        send(method, params = {}, msgTimeout = timeout) {
          return new Promise((res, rej) => {
            const id = ++msgId;
            const timer = setTimeout(() => {
              pending.delete(id);
              rej(
                new Error(
                  `CDP message timeout after ${msgTimeout}ms for ${method}`,
                ),
              );
            }, msgTimeout);
            pending.set(id, {
              resolve: (v) => {
                clearTimeout(timer);
                res(v);
              },
              reject: (e) => {
                clearTimeout(timer);
                rej(e);
              },
            });
            const msg = JSON.stringify({ id, method, params });
            ws.send(msg);
          });
        },
        close() {
          ws.close();
        },
      });
    };

    ws.onmessage = (evt) => {
      const data = typeof evt.data === 'string' ? evt.data : evt.data.toString();
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        // Non-JSON frame — ignore
        return;
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) {
          rej(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
        } else {
          res(msg.result);
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket error: ${err.message || err}`));
    };

    ws.onclose = () => {
      clearTimeout(timer);
      for (const [, { reject: rej }] of pending) {
        rej(new Error('WebSocket closed'));
      }
      pending.clear();
    };
  });
}

/**
 * Evaluate a JS expression in the app's Hermes runtime via CDP Runtime.evaluate.
 * Returns the evaluated value (primitives and JSON-serialisable objects).
 */
async function cdpEval(client, expression) {
  // Hermes doesn't support async in Runtime.evaluate, use a plain IIFE
  const wrapped = `(function() { return (${expression}); })()`;
  const result = await client.send('Runtime.evaluate', {
    expression: wrapped,
    returnByValue: true,
    awaitPromise: false,
    generatePreview: false,
  });

  if (result.exceptionDetails) {
    const desc =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      JSON.stringify(result.exceptionDetails);
    throw new Error(`Evaluation error: ${desc}`);
  }

  return result.result?.value;
}

/**
 * Evaluate a JS expression that returns a Promise.
 * Hermes CDP doesn't support awaitPromise, so we store the result on
 * globalThis.__cdp_async__ and poll for it.
 */
async function cdpEvalAsync(client, expression, timeoutMs = 30000) {
  // Unique key per call to avoid collisions
  const key = `__cdp_async_${Date.now()}_${Math.random().toString(36).slice(2)}__`;

  // Kick off the promise, store result when done.
  // The try/catch guards against synchronous throws during argument evaluation
  // of Promise.resolve(<expression>) — without it, a sync error escapes the
  // IIFE and globalThis[key] stays 'pending' forever.
  const kickoff = `(function() {
    globalThis['${key}'] = { status: 'pending' };
    try {
      Promise.resolve(${expression})
        .then(function(v) { globalThis['${key}'] = { status: 'resolved', value: v }; })
        .catch(function(e) { globalThis['${key}'] = { status: 'rejected', error: String(e) }; });
    } catch(e) {
      globalThis['${key}'] = { status: 'rejected', error: String(e) };
    }
    return 'started';
  })()`;

  const kickoffResult = await client.send('Runtime.evaluate', {
    expression: kickoff,
    returnByValue: true,
    awaitPromise: false,
  }, timeoutMs);

  // If the IIFE itself failed to evaluate (syntax error, etc.), bail early
  if (kickoffResult.exceptionDetails) {
    const desc =
      kickoffResult.exceptionDetails.exception?.description ||
      kickoffResult.exceptionDetails.text ||
      JSON.stringify(kickoffResult.exceptionDetails);
    throw new Error(`Async evaluation error: ${desc}`);
  }

  // Best-effort cleanup — swallow errors so a disconnected WebSocket
  // doesn't obscure the actual result or diagnostic error.
  const cleanup = () =>
    client
      .send('Runtime.evaluate', {
        expression: `delete globalThis['${key}']`,
        returnByValue: true,
        awaitPromise: false,
      })
      // eslint-disable-next-line no-empty-function
      .catch(() => {});

  // Poll for completion
  const pollInterval = 200;
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const check = await client.send('Runtime.evaluate', {
        expression: `(function() { return globalThis['${key}']; })()`,
        returnByValue: true,
        awaitPromise: false,
      }, timeoutMs);
      const val = check.result?.value;
      if (val && val.status === 'resolved') {
        return val.value;
      }
      if (val && val.status === 'rejected') {
        throw new Error(`Async evaluation error: ${val.error}`);
      }
    }
    throw new Error(`Async evaluation timed out after ${timeoutMs}ms`);
  } finally {
    await cleanup();
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

// Map of nested route names to their parent navigator.
// When navigating to a nested route, we need: navigate('Parent', { screen: 'Child', params })
// Routes not in this map are assumed to be root-level and navigated to directly.
const NESTED_ROUTE_PARENTS = {
  // Perps
  PerpsMarketListView: 'Perps', PerpsMarketDetails: 'Perps', PerpsPositions: 'Perps',
  PerpsTrendingView: 'Perps', PerpsWithdraw: 'Perps', PerpsTutorial: 'Perps',
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
    const routeName = args[0];
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
    return Object.assign({}, snapshot, { deviceName: deviceName || '', platform: platform || '' });
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
    if (!injectResult || !injectResult.ok) {
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
      ok: (pressResult && pressResult.ok) || false,
      injected: true,
      pressed: (pressResult && pressResult.ok) || false,
      error: pressResult?.error,
      deviceName,
    };
  },

  async recipe(client, args) {
    const arg = args[0];
    if (!arg || arg === '--help') {
      console.error('Usage: recipe <team/name> | recipe --list');
      process.exit(1);
    }

    const recipesDir = path.resolve(__dirname, 'recipes');

    if (arg === '--list') {
      // List all available recipes from recipes/*.json
      const files = fs.readdirSync(recipesDir).filter((f) => f.endsWith('.json'));
      const all = {};
      for (const file of files) {
        const team = path.basename(file, '.json');
        const data = JSON.parse(fs.readFileSync(path.join(recipesDir, file), 'utf8'));
        all[team] = Object.fromEntries(
          Object.entries(data).map(([name, r]) => [name, r.description || ''])
        );
      }
      return all;
    }

    // Parse "team/name"
    const parts = arg.split('/');
    if (parts.length !== 2) {
      throw new Error('Recipe must be in "team/name" format (e.g. perps/positions)');
    }
    const [team, name] = parts;
    const recipeFile = path.join(recipesDir, `${team}.json`);
    if (!fs.existsSync(recipeFile)) {
      throw new Error(`No recipe file found: recipes/${team}.json`);
    }
    const recipes = JSON.parse(fs.readFileSync(recipeFile, 'utf8'));
    const recipe = recipes[name];
    if (!recipe) {
      const available = Object.keys(recipes).join(', ');
      throw new Error(`Recipe "${name}" not found in ${team}. Available: ${available}`);
    }

    let raw;
    if (recipe.async) {
      raw = await cdpEvalAsync(client, recipe.expression);
    } else {
      raw = await cdpEval(client, recipe.expression);
    }
    // Recipe expressions typically JSON.stringify their result.
    // Parse it so main()'s JSON.stringify produces clean output
    // instead of double-encoded strings.
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        // Not valid JSON — return as-is
      }
    }
    return raw;
  },
};

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
  sentry-debug [enable|disable]          Patch Sentry to log errors to console with [SENTRY-DEBUG] prefix
  unlock <password>                      Unlock wallet (inject password + press login button via fiber tree)
  recipe <team/name>                   Run a recipe (e.g. perps/positions)
  recipe --list                        List all available recipes

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

  // `recipe --list` only reads local JSON files — skip CDP connection entirely.
  if (command === 'recipe' && args[1] === '--list') {
    const result = await handler(null, args.slice(1), {});
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const port = loadPort();
  const timeout = Number.parseInt(process.env.CDP_TIMEOUT || '5000', 10);

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
