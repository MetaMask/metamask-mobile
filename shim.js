/* eslint-disable import-x/no-nodejs-modules */
import { Platform } from 'react-native';
import {
  getRandomValues,
  randomUUID,
  subtle as quickCryptoSubtle,
} from 'react-native-quick-crypto';
import { LaunchArguments } from 'react-native-launch-arguments';
import {
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
  isE2E,
  isTest,
  enableApiCallLogs,
  testConfig,
} from './app/util/test/utils.js';
import { WS_SERVICES } from './tests/websocket/constants.ts';
import { defaultMockPort } from './tests/api-mocking/mock-config/mockUrlCollection.json';

import './shimPerf';

// Needed to polyfill random number generation
import 'react-native-get-random-values';

// Needed to polyfill WalletConnect
import '@walletconnect/react-native-compat';

// Needed to polyfill URL
import 'react-native-url-polyfill/auto';

// Needed to polyfill browser
require('react-native-browser-polyfill'); // eslint-disable-line import-x/no-commonjs

// Log early if running in E2E mode to help diagnose accidental js.env flags
if (isE2E) {
  // eslint-disable-next-line no-console
  console.warn(
    '[E2E MODE] App running with isE2E=true. If unexpected, check your .js.env and unset IS_TEST or METAMASK_ENVIRONMENT=e2e.',
  );
  // eslint-disable-next-line no-console
  console.warn(
    `IS_TEST=${process.env.IS_TEST || 'unset'} METAMASK_ENVIRONMENT=${
      process.env.METAMASK_ENVIRONMENT || 'unset'
    }`,
  );
}

// In a testing environment, configure server ports for fixture and command queue servers.
//
// We pass dynamic ports via launchArgs in FixtureHelper.ts, but react-native-launch-arguments
// library behavior differs by platform:
//
// iOS: LaunchArguments.value() successfully reads Detox launchArgs → returns { fixtureServerPort: "30002", ... }
//      App uses the dynamic port directly.
//
// Android: LaunchArguments.value() returns {} (library doesn't integrate with Detox on Android)
//          → ALWAYS falls back to hardcoded ports (12345 for fixtures, 2446 for command queue)
//          Since we need dynamic ports for parallel test execution, the E2E infrastructure uses
//          adb reverse to transparently map these hardcoded ports to dynamically allocated ports.
//          Example: App connects to localhost:12345, adb reverse maps it to host port 30002.
//          See FixtureHelper.ts for the port mapping implementation.
if (isTest) {
  const raw = LaunchArguments.value();
  testConfig.fixtureServerPort = raw?.fixtureServerPort
    ? raw.fixtureServerPort
    : FALLBACK_FIXTURE_SERVER_PORT;
  testConfig.commandQueueServerPort = raw?.commandQueueServerPort
    ? raw.commandQueueServerPort
    : FALLBACK_COMMAND_QUEUE_SERVER_PORT;
}

// Fix for https://github.com/facebook/react-native/issues/5667
if (typeof global.self === 'undefined') {
  global.self = global;
}

if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';
if (typeof process === 'undefined') {
  // Polyfill process if it's not available
  global.process = require('process');
} else {
  // Merge polyfill with process without overriding existing properties
  const bProcess = require('process');
  for (const p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p];
    }
  }
}

// Use faster Buffer implementation for React Native
global.Buffer = require('@craftzdog/react-native-buffer').Buffer; // eslint-disable-line import-x/no-commonjs

// Polyfill crypto after process is polyfilled
const crypto = require('crypto'); // eslint-disable-line import-x/no-commonjs

// Needed to polyfill crypto
global.crypto = {
  ...global.crypto,
  ...crypto,
  randomUUID,
  getRandomValues,
  subtle: {
    ...global.crypto.subtle,
    ...crypto.subtle,
    // Shimming just digest as it has been fully implemented.
    digest: quickCryptoSubtle.digest,
  },
};

process.browser = false;

// EventTarget polyfills for Hyperliquid SDK WebSocket support
if (
  typeof global.EventTarget === 'undefined' ||
  typeof global.Event === 'undefined'
) {
  const { Event, EventTarget } = require('event-target-shim');
  global.EventTarget = EventTarget;
  global.Event = Event;
}

if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = function (type, params) {
    params = params || {};
    const event = new global.Event(type, params);
    event.detail = params.detail || null;
    return event;
  };
}

class AbortError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AbortError';
  }
}

// The ReactNative polyfill for AbortController does not populate `signal.reason`.
class AbortControllerWithReason extends AbortController {
  abort(reason) {
    if (this.signal.aborted) {
      return;
    }

    this.signal.reason =
      reason === undefined
        ? new AbortError('Signal is aborted without reason')
        : reason;
    super.abort();
  }
}

global.AbortController = AbortControllerWithReason;

if (typeof global.AbortSignal.timeout === 'undefined') {
  // In the browser this is a DOMException.
  class TimeoutError extends Error {
    constructor(message) {
      super(message);
      this.name = 'TimeoutError';
    }
  }

  global.AbortSignal.timeout = function (delay) {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new TimeoutError('Signal timed out')),
      delay,
    );
    return controller.signal;
  };
}

if (typeof global.Promise.withResolvers === 'undefined') {
  global.Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// global.location = global.location || { port: 80 }
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
Object.assign(process.env, { NODE_ENV: isDev ? 'development' : 'production' });

if (typeof localStorage !== 'undefined') {
  // eslint-disable-next-line no-undef
  localStorage.debug = isDev ? '*' : '';
}

if (enableApiCallLogs || isTest) {
  (async () => {
    const raw = LaunchArguments.value();
    const mockServerPort = raw?.mockServerPort ?? defaultMockPort;
    const { fetch: originalFetch } = global;

    // eslint-disable-next-line no-console
    console.log(
      `[E2E SHIM] Platform: ${Platform.OS}, mockServerPort: ${mockServerPort}`,
    );

    // Try multiple hosts to find available mock server
    // Priority order:
    // 1. localhost (works on iOS, works on Android with adb reverse)
    // 2. 10.0.2.2 (Android emulator host - direct access without adb reverse!)
    const hosts = ['localhost'];
    if (Platform.OS === 'android') {
      hosts.push('10.0.2.2');
    }

    let MOCKTTP_URL = '';
    let isMockServerAvailable = false;

    for (const host of hosts) {
      const testUrl = `http://${host}:${mockServerPort}`;
      // eslint-disable-next-line no-console
      console.log(`[E2E SHIM] Trying mock server at: ${testUrl}`);

      const available = await originalFetch(`${testUrl}/health-check`)
        .then((res) => {
          // eslint-disable-next-line no-console
          console.log(`[E2E SHIM] ${host} health check: ${res.ok}`);
          return res.ok;
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.log(`[E2E SHIM] ${host} health check failed: ${err.message}`);
          return false;
        });

      if (available) {
        MOCKTTP_URL = testUrl;
        isMockServerAvailable = true;
        // eslint-disable-next-line no-console
        console.log(`[E2E SHIM] Mock server connected via ${host}`);
        break;
      }
    }

    // if mockServer is off we route to original destination
    global.fetch = async (url, options) => {
      // Extract URL string from Request or URL objects
      let urlString;
      if (typeof url === 'string') {
        urlString = url;
      } else if (url instanceof URL) {
        urlString = url.href;
      } else if (url && typeof url === 'object' && url.url) {
        // Request object has a 'url' property
        urlString = url.url;
      } else {
        urlString = String(url);
      }

      return isMockServerAvailable
        ? originalFetch(
            `${MOCKTTP_URL}/proxy?url=${encodeURIComponent(urlString)}`,
            options,
          ).catch(() => originalFetch(url, options))
        : originalFetch(url, options);
    };

    if (isMockServerAvailable) {
      // Patch XMLHttpRequest for Axios and other libraries
      const OriginalXHR = global.XMLHttpRequest;

      if (OriginalXHR) {
        global.XMLHttpRequest = function (...args) {
          const xhr = new OriginalXHR(...args);
          const originalOpen = xhr.open;

          xhr.open = function (method, url, ...openArgs) {
            try {
              // Route external URLs through mock server proxy
              if (
                typeof url === 'string' &&
                (url.startsWith('http://') || url.startsWith('https://'))
              ) {
                // Bypass proxy for local command queue server
                try {
                  const parsed = new URL(url);
                  const isLocalHost =
                    parsed.hostname === 'localhost' ||
                    parsed.hostname === '127.0.0.1' ||
                    parsed.hostname === '10.0.2.2';
                  const isCommandQueue =
                    isLocalHost &&
                    parsed.port ===
                      String(
                        testConfig.commandQueueServerPort ||
                          FALLBACK_COMMAND_QUEUE_SERVER_PORT,
                      );
                  if (isCommandQueue) {
                    return originalOpen.call(this, method, url, ...openArgs);
                  }
                } catch (e) {
                  // ignore URL parse errors and continue to proxy
                }
                if (
                  !url.includes(`localhost:${mockServerPort}`) &&
                  !url.includes('/proxy')
                ) {
                  const originalUrl = url;
                  url = `${MOCKTTP_URL}/proxy?url=${encodeURIComponent(url)}`;
                }
              }
              return originalOpen.call(this, method, url, ...openArgs);
            } catch (error) {
              return originalOpen.call(this, method, url, ...openArgs);
            }
          };

          return xhr;
        };

        // Copy static properties and prototype chain
        try {
          Object.setPrototypeOf(global.XMLHttpRequest, OriginalXHR);
          Object.assign(global.XMLHttpRequest, OriginalXHR);

          // Store reference to verify patching worked
          global.__MOCK_XHR_PATCHED = true;
          global.__ORIGINAL_XHR = OriginalXHR;

          // eslint-disable-next-line no-console
          console.log(
            '[XHR Patch] Successfully patched XMLHttpRequest for E2E testing',
          );
        } catch (error) {
          console.warn('[XHR Patch] Failed to copy XHR properties:', error);
          // Restore original if copying failed
          global.XMLHttpRequest = OriginalXHR;
        }
      } else {
        console.warn(
          '[XHR Patch] XMLHttpRequest not available, skipping patch',
        );
      }

      // Patch WebSocket to route production wss:// URLs to local mock servers.
      // Each WS service gets its own mock port via WS_SERVICES config.
      // Non-matching wss:// URLs pass through unchanged.
      if (WS_SERVICES.length > 0 && global.WebSocket) {
        const OriginalWebSocket = global.WebSocket;

        const wsRoutes = {};
        for (const svc of WS_SERVICES) {
          const port = raw?.[svc.launchArgKey] ?? svc.fallbackPort;
          wsRoutes[svc.url] = `ws://localhost:${port}`;
        }

        global.WebSocket = function (url, protocols) {
          let targetUrl = url;
          if (typeof url === 'string') {
            for (const [prefix, localUrl] of Object.entries(wsRoutes)) {
              if (url.startsWith(prefix)) {
                targetUrl = localUrl;
                break;
              }
            }
          }
          return protocols !== undefined
            ? new OriginalWebSocket(targetUrl, protocols)
            : new OriginalWebSocket(targetUrl);
        };

        Object.setPrototypeOf(global.WebSocket, OriginalWebSocket);
        Object.assign(global.WebSocket, OriginalWebSocket);
        global.WebSocket.prototype = OriginalWebSocket.prototype;

        // eslint-disable-next-line no-console
        console.log(`[WS Patch] Routes: ${JSON.stringify(wsRoutes)}`);
      }

      // Patch expo/fetch so its native networking routes through the mock proxy.
      // The re-export in expo/src/winter/fetch/index.ts uses `export * from`
      // which Babel compiles to a non-configurable getter. Patching the
      // re-exporter's property silently fails. Instead we patch the SOURCE
      // module (expo/src/winter/fetch/fetch) where `fetch` is a plain
      // writable export. The re-export getter reads from the source, so
      // all consumers (including bridge-controller) pick up the patched fn.
      try {
        const fetchSourceModule = require('expo/src/winter/fetch/fetch');
        const originalExpoFetch = fetchSourceModule.fetch;
        fetchSourceModule.fetch = (url, options) => {
          const proxyUrl = `${MOCKTTP_URL}/proxy?url=${encodeURIComponent(url)}`;
          // eslint-disable-next-line no-console
          console.log(`[E2E SHIM] expo/fetch: ${url} → ${proxyUrl}`);
          return originalExpoFetch(proxyUrl, options);
        };
        // eslint-disable-next-line no-console
        console.log(
          '[E2E SHIM] Patched expo/fetch source module to route through mock proxy',
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[E2E SHIM] Failed to patch expo/fetch:', e.message);
      }
    }
  })();
}
