#!/usr/bin/env node
/* eslint-disable no-undef, import/no-extraneous-dependencies */
/**
 * CDP Bridge — Connect to the running MetaMask app via Hermes Chrome DevTools Protocol.
 *
 * Usage:
 *   node scripts/agentic/cdp-bridge.js navigate PerpsHome '{"symbol":"BTC"}'
 *   node scripts/agentic/cdp-bridge.js get-route
 *   node scripts/agentic/cdp-bridge.js get-state "engine.backgroundState.NetworkController"
 *   node scripts/agentic/cdp-bridge.js eval "1+1"
 *
 * Environment:
 *   WATCHER_PORT  Metro port (default: 8081, read from .js.env if present)
 *   CDP_TIMEOUT   Connection timeout in ms (default: 5000)
 */

'use strict';

const http = require('http');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a value from .js.env */
function loadEnvValue(key) {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(__dirname, '../../.js.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (match) return match[1].trim();
  } catch (_) {
    // ignore
  }
  return undefined;
}

/** Read WATCHER_PORT from .js.env or env (default: 8081) */
function loadPort() {
  return parseInt(loadEnvValue('WATCHER_PORT') || process.env.WATCHER_PORT || '8081', 10);
}

/** Read IOS_SIMULATOR name from .js.env or env (default: none — accept any device) */
function loadSimulatorName() {
  return loadEnvValue('IOS_SIMULATOR') || process.env.IOS_SIMULATOR || '';
}

/** Read ANDROID_DEVICE serial from .js.env or env (default: none — accept any device) */
function loadAndroidDevice() {
  return loadEnvValue('ANDROID_DEVICE') || process.env.ANDROID_DEVICE || '';
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
  } catch (_) {
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
    const aPage = parseInt((a.id || '').split('-').pop() || '0', 10);
    const bPage = parseInt((b.id || '').split('-').pop() || '0', 10);
    return bPage - aPage;
  });

  // Probe candidates to find the one with __AGENTIC__ installed (the JS runtime)
  for (const candidate of candidates) {
    const hasAgentic = await probeTarget(candidate.webSocketDebuggerUrl);
    if (hasAgentic) {
      return candidate.webSocketDebuggerUrl;
    }
  }

  // Fallback: return highest page number (most likely the JS runtime)
  return candidates[0].webSocketDebuggerUrl;
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
        WebSocketImpl = require('ws');
      } catch (_) {
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
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const id = ++msgId;
            pending.set(id, { resolve: res, reject: rej });
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
      } catch (_) {
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
  async navigate(client, args) {
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
    const route = await cdpEval(
      client,
      'globalThis.__AGENTIC__?.getRoute()',
    );
    return { navigated: routeName, params, currentRoute: route };
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

  async 'can-go-back'(client) {
    return await cdpEval(client, 'globalThis.__AGENTIC__?.canGoBack()');
  },

  async 'go-back'(client) {
    await cdpEval(client, 'globalThis.__AGENTIC__?.goBack()');
    await new Promise((r) => setTimeout(r, 300));
    const route = await cdpEval(
      client,
      'globalThis.__AGENTIC__?.getRoute()',
    );
    return { currentRoute: route };
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
  node scripts/agentic/cdp-bridge.js <command> [args...]

Commands:
  navigate <RouteName> [params-json]   Navigate to a screen
  get-route                            Get current route name and params
  get-state [dot.path]                 Get Redux state (or nav state if no path)
  eval <expression>                    Evaluate arbitrary JS in app context
  can-go-back                          Check if navigation can go back
  go-back                              Navigate back

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

  const port = loadPort();
  const timeout = parseInt(process.env.CDP_TIMEOUT || '5000', 10);

  const wsUrl = await discoverTarget(port);
  const client = await createWSClient(wsUrl, timeout);

  try {
    const result = await handler(client, args.slice(1));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
