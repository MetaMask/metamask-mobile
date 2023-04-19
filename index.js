// Needed to polyfill random number generation.
import 'react-native-get-random-values';
import './shim.js';

import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import crypto from 'crypto'; // eslint-disable-line import/no-nodejs-modules, no-unused-vars
require('react-native-browser-polyfill'); // eslint-disable-line import/no-commonjs

import { setupSentry } from './app/util/sentryUtils';
setupSentry();

import { AppRegistry, LogBox } from 'react-native';
import Root from './app/components/Views/Root';
import { name } from './app.json';

// List of warnings that we're ignoring
LogBox.ignoreLogs([
  '{}',
  // Uncomment the below lines (21 and 22) to run browser-tests.spec.js in debug mode
  // in e2e tests until issue https://github.com/MetaMask/metamask-mobile/issues/1395 is resolved
  //"Error in RPC response",
  // 'User rejected account access',
  "Can't perform a React state update",
  'Error evaluating injectedJavaScript',
  'createErrorFromErrorData',
  'Encountered an error loading page',
  'Error handling userAuthorizedUpdate',
  'MaxListenersExceededWarning',
  'Expected delta of 0 for the fields',
  'The network request was invalid',
  'Require cycle',
  'ListView is deprecated',
  'WebView has been extracted from react-native core',
  'Exception was previously raised by watchStore',
  'StateUpdateController',
  'this.web3.eth',
  'collectibles.map',
  'Warning: bind(): You are binding a component method to the component',
  'AssetsDectionController._callee',
  'Accessing view manager configs directly off',
  'Function components cannot be given refs.',
  'Task orphaned for request',
  'Module RNOS requires',
  'use RCT_EXPORT_MODULE',
  'Setting a timer for a long period of time',
  'Did not receive response to shouldStartLoad in time',
  'startLoadWithResult invoked with invalid',
  'RCTBridge required dispatch_sync',
  'Remote debugger is in a background tab',
  "Can't call setState (or forceUpdate) on an unmounted component",
  'No stops in gradient',
  "Cannot read property 'hash' of null",
  'componentWillUpdate',
  'componentWillReceiveProps',
  'getNode()',
  'Non-serializable values were found in the navigation state.', // We are not saving navigation state so we can ignore this
  'new NativeEventEmitter', // New libraries have not yet implemented native methods to handle warnings (https://stackoverflow.com/questions/69538962/new-nativeeventemitter-was-called-with-a-non-null-argument-without-the-requir)
  'EventEmitter.removeListener',
  'Module TcpSockets requires main queue setup',
  'Module RCTSearchApiManager requires main queue setup',
  'PushNotificationIOS has been extracted', // RNC PushNotification iOS issue - https://github.com/react-native-push-notification/ios/issues/43
]);

const IGNORE_BOXLOGS_DEVELOPMENT = process.env.IGNORE_BOXLOGS_DEVELOPMENT;
// Ignore box logs, usefull for QA testing in development builds
if (IGNORE_BOXLOGS_DEVELOPMENT === 'true') {
  LogBox.ignoreAllLogs();
}

/* Uncomment and comment regular registration below */
// import Storybook from './storybook';
// AppRegistry.registerComponent(name, () => Storybook);

/**
 * Application entry point responsible for registering root component
 */
AppRegistry.registerComponent(name, () => Root);

// Test BigInt primitives

console.log(1n + 2n); // 3n
console.log(typeof (1n + 2n)); // bigint

console.log(BigInt(2) + BigInt(3)); // 5n
console.log(typeof (BigInt(2) + BigInt(3))); // bigint

// Test "@metamask/utils": "^5.0.1" (latest)

import { isObject, hasProperty } from '@metamask/utils';

const obj = { a: 1, b: { c: 2 } };
console.log(isObject(obj)); // true

const propName = 'b';
console.log(hasProperty(obj, propName)); // true

const nonExistentPropName = 'd';
console.log(hasProperty(obj, nonExistentPropName)); // false

// Test "@ethereumjs/util": "^8.0.5" (latest)

import {
  arrToBufArr,
  bufferToHex,
  ecsign,
  publicToAddress,
  toBuffer,
  hashPersonalMessage,
  privateToPublic,
} from '@ethereumjs/util';

// Test arrToBufArr fn
// const arr = [1, 2, 3, 4, 5]; // TypeError: The "value" argument must not be of type number. Received type number
const arr = new Uint8Array([1, 2, 3]);
const bufArr = arrToBufArr(arr);
console.log(bufArr); // {"data": [1, 2, 3], "type": "Buffer"}

// Test bufferToHex fn
const buffer = Buffer.from('Hello World', 'utf8');
const hex = bufferToHex(buffer);
console.log(hex); // 0x48656c6c6f20576f726c64

// Test ecsign fn
const privateKey = Buffer.from(
  'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
  'hex',
);
const message = hashPersonalMessage(Buffer.from('Hello World', 'utf8'));
const signature = ecsign(message, privateKey);
console.log(signature); // {"r": {"data": [Array], "type": "Buffer"}, "s": {"data": [Array], "type": "Buffer"}, "v": 28n}

// Test publicToAddress fn
const publicKey = privateToPublic(privateKey);
const address = publicToAddress(publicKey);
console.log(address); // {"data": [239, 192, 115, 33, 211, 214, 168, 250, 73, 97, 48, 108, 123, 245, 85, 240, 114, 63, 40, 193], "type": "Buffer"}

// Test toBuffer fn
const int = 12345;
const bufferInt = toBuffer(int);
console.log(bufferInt); // {"data": [48, 57], "type": "Buffer"}
