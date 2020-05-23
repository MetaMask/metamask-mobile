import './shim.js';

import 'react-native-gesture-handler';

import crypto from 'crypto'; // eslint-disable-line import/no-nodejs-modules, no-unused-vars
require('react-native-browser-polyfill'); // eslint-disable-line import/no-commonjs

import setupSentry from './app/util/setupSentry';
setupSentry();

import { AppRegistry, YellowBox } from 'react-native';
import Root from './app/components/Views/Root';
import { name } from './app.json';
// eslint-disable-next-line import/no-unresolved
import { useScreens } from 'react-native-screens';
useScreens();

// List of warnings that we're ignoring
YellowBox.ignoreWarnings([
	'{}',
	// Uncomment the below line to run browser-tests.spec.js in debug mode
	// in e2e tests until issue https://github.com/MetaMask/metamask-mobile/issues/1395 is resolved
	//"Error in RPC response",
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
	'VirtualizedLists should never be nested inside plain ScrollViews'
]);

/**
 * Application entry point responsible for registering root component
 */
AppRegistry.registerComponent(name, () => Root);
