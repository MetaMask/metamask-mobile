import './shim.js';

// Needed to polyfill random number generation.
import 'react-native-get-random-values';
import '@walletconnect/react-native-compat';

import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import crypto from 'crypto'; // eslint-disable-line import/no-nodejs-modules, no-unused-vars
require('react-native-browser-polyfill'); // eslint-disable-line import/no-commonjs

import * as Sentry from '@sentry/react-native'; // eslint-disable-line import/no-namespace
import { setupSentry } from './app/util/sentry/utils';
setupSentry();

import { AppRegistry, LogBox } from 'react-native';
import Root from './app/components/Views/Root';
import { name } from './app.json';

// List of warnings that we're ignoring
LogBox.ignoreAllLogs();

const IGNORE_BOXLOGS_DEVELOPMENT = process.env.IGNORE_BOXLOGS_DEVELOPMENT;
// Ignore box logs, useful for QA testing in development builds
if (IGNORE_BOXLOGS_DEVELOPMENT === 'true') {
  LogBox.ignoreAllLogs();
}

/* Uncomment and comment regular registration below */
// import Storybook from './.storybook';
// AppRegistry.registerComponent(name, () => Storybook);

/**
 * Application entry point responsible for registering root component
 */
AppRegistry.registerComponent(name, () =>
  // Disable Sentry for E2E tests
  process.env.IS_TEST === 'true' ? Root : Sentry.wrap(Root),
);
