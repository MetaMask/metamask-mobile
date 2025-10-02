/* eslint-disable import/no-nodejs-modules */
import { Platform } from 'react-native';
import { decode, encode } from 'base-64';
import { getRandomValues, randomUUID } from 'react-native-quick-crypto';
import { LaunchArguments } from 'react-native-launch-arguments';
import {
  FIXTURE_SERVER_PORT,
  isE2E,
  isTest,
  enableApiCallLogs,
  testConfig,
} from './app/util/test/utils.js';
import { defaultMockPort } from './e2e/api-mocking/mock-config/mockUrlCollection.json';

// Needed to polyfill random number generation
import 'react-native-get-random-values';

// Needed to polyfill WalletConnect
import '@walletconnect/react-native-compat';

// Needed to polyfill URL
import 'react-native-url-polyfill/auto';

// Needed to polyfill browser
require('react-native-browser-polyfill'); // eslint-disable-line import/no-commonjs

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

// In a testing environment, assign the fixtureServerPort to use a deterministic port
if (isTest) {
  const raw = LaunchArguments.value();
  testConfig.fixtureServerPort = raw?.fixtureServerPort
    ? raw.fixtureServerPort
    : FIXTURE_SERVER_PORT;
}

if (!global.btoa) {
  global.btoa = encode;
}

if (!global.atob) {
  global.atob = decode;
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

// Polyfill crypto after process is polyfilled
const crypto = require('crypto'); // eslint-disable-line import/no-commonjs

// Needed to polyfill crypto
global.crypto = {
  ...global.crypto,
  ...crypto,
  randomUUID,
  getRandomValues,
};

process.browser = false;
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer;

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

if (typeof global.AbortSignal.timeout === 'undefined') {
  global.AbortSignal.timeout = function (delay) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), delay);
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
    const MOCKTTP_URL = `http://${
      Platform.OS === 'ios' ? 'localhost' : '10.0.2.2'
    }:${mockServerPort}`;

    const isMockServerAvailable = await originalFetch(
      `${MOCKTTP_URL}/health-check`,
    )
      .then((res) => res.ok)
      .catch(() => false);

    // if mockServer is off we route to original destination
    global.fetch = async (url, options) =>
      isMockServerAvailable
        ? originalFetch(
            `${MOCKTTP_URL}/proxy?url=${encodeURIComponent(url)}`,
            options,
          ).catch(() => originalFetch(url, options))
        : originalFetch(url, options);

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
    }
  })();
}
