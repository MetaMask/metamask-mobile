/* eslint-disable import/no-nodejs-modules */
/* global Platform */
import { decode, encode } from 'base-64';
import {
  FIXTURE_SERVER_PORT,
  isTest,
  testConfig,
} from './app/util/test/utils.js';
import { LaunchArguments } from 'react-native-launch-arguments';
import { defaultMockPort } from './e2e/api-mocking/mock-config/mockUrlCollection.json';

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
  global.process = require('process');
} else {
  const bProcess = require('process');
  for (const p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p];
    }
  }
}

process.browser = false;
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer;

// global.location = global.location || { port: 80 }
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
Object.assign(process.env, { NODE_ENV: isDev ? 'development' : 'production' });

if (typeof localStorage !== 'undefined') {
  // eslint-disable-next-line no-undef
  localStorage.debug = isDev ? '*' : '';
}

// If using the crypto shim, uncomment the following line to ensure
// crypto is loaded first, so it can populate global.crypto
// require('crypto')

if (isTest) {
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
