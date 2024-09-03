/* eslint-disable import/no-nodejs-modules */
import { decode, encode } from 'base-64';
import { XMLHttpRequest as _XMLHttpRequest } from 'xhr2';
import {
  FIXTURE_SERVER_PORT,
  isTest,
  testConfig,
} from './app/util/test/utils.js';
import { LaunchArguments } from 'react-native-launch-arguments';

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

// Ensure XMLHttpRequest is available
global.XMLHttpRequest = global.XMLHttpRequest || _XMLHttpRequest;

// Store original methods
const { open: originalOpen, send: originalSend } = XMLHttpRequest.prototype;

// Mockttp server URL
const MOCKTTP_URL = 'http://localhost:8000'; // Replace with your Mockttp server address

// Override 'open' method to route through Mockttp
XMLHttpRequest.prototype.open = function (method, url) {
  this._requestMethod = method;
  this._requestUrl = url;
  const proxiedUrl =
    url.startsWith('http://') || url.startsWith('https://')
      ? `${MOCKTTP_URL}/proxy?url=${encodeURIComponent(url)}`
      : url;
  return originalOpen.call(this, method, proxiedUrl);
};

// Override 'send' method to log request details
XMLHttpRequest.prototype.send = function (body) {
  console.log(`Request Made: ${this._requestMethod} ${this._requestUrl}`);
  if (body) console.log(`Request Body: ${body}`);
  return originalSend.call(this, body);
};
