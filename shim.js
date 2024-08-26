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

// If using the crypto shim, uncomment the following line to ensure
// crypto is loaded first, so it can populate global.crypto
// require('crypto')

// Ensure global XMLHttpRequest is available
// if (typeof global.XMLHttpRequest === 'undefined') {
//   global.XMLHttpRequest = _XMLHttpRequest;
// }

// // Store original methods for later use
// const originalOpen = XMLHttpRequest.prototype.open;
// const originalSend = XMLHttpRequest.prototype.send;

// // Override the 'open' method to log the request URL
// XMLHttpRequest.prototype.open = function (method, url) {
//   this._requestMethod = method;
//   this._requestUrl = url;
//   return originalOpen.apply(this, arguments);
// };

// // Override the 'send' method to log the request details
// XMLHttpRequest.prototype.send = function (body) {
//   console.log(`Request Made: ${this._requestMethod} ${this._requestUrl}`);
//   if (body) {
//     console.log(`Request Body: ${body}`);
//   }
//   return originalSend.apply(this, arguments);
// };

// Ensure global XMLHttpRequest is available
if (typeof global.XMLHttpRequest === 'undefined') {
  global.XMLHttpRequest = _XMLHttpRequest;
}

// Store original methods for later use
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

// Proxy server address (Mockttp server)
const MOCKTTP_URL = 'http://localhost:8000'; // Replace with the correct Mockttp port

// Override the 'open' method to log the request URL and route through Mockttp
XMLHttpRequest.prototype.open = function (method, url) {
  this._requestMethod = method;
  this._requestUrl = url;

  // Modify the URL to route through the Mockttp server
  const proxiedUrl =
    url.startsWith('http://') || url.startsWith('https://')
      ? `${MOCKTTP_URL}/proxy?url=${encodeURIComponent(url)}`
      : url;

  // Call the original 'open' method with the proxied URL
  return originalOpen.apply(this, [method, proxiedUrl]);
};

// Override the 'send' method to log the request details
XMLHttpRequest.prototype.send = function (body) {
  console.log(`Request Made: ${this._requestMethod} ${this._requestUrl}`);
  if (body) {
    console.log(`Request Body: ${body}`);
  }
  return originalSend.apply(this, arguments);
};