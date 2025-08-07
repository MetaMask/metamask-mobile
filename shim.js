/* eslint-disable import/no-nodejs-modules */
import { Platform } from 'react-native';
import { decode, encode } from 'base-64';
import { getRandomValues, randomUUID } from 'react-native-quick-crypto';
import { LaunchArguments } from 'react-native-launch-arguments';
import {
  FIXTURE_SERVER_PORT,
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
  })();
}
