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

import notifee, { EventType } from '@notifee/react-native';

import { AppRegistry, LogBox } from 'react-native';
import Root from './app/components/Views/Root';
import { name } from './app.json';
import { isTest } from './app/util/test/utils.js';

import NotificationManager from './app/core/NotificationManager';
import { isNotificationsFeatureEnabled } from './app/util/notifications/methods';

// List of warnings that we're ignoring

LogBox.ignoreAllLogs();

const IGNORE_BOXLOGS_DEVELOPMENT = process.env.IGNORE_BOXLOGS_DEVELOPMENT;
// Ignore box logs, useful for QA testing in development builds
if (IGNORE_BOXLOGS_DEVELOPMENT === 'true') {
  LogBox.ignoreAllLogs();
}

isNotificationsFeatureEnabled() &&
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;

    // Disable badge count https://notifee.app/react-native/docs/ios/badges#removing-the-badge-count
    notifee.setBadgeCount(0).then(async () => {
      if (
        type === EventType.ACTION_PRESS &&
        pressAction.id === 'mark-as-read'
      ) {
        await notifee.cancelNotification(notification.id);
      } else {
        NotificationManager.onMessageReceived(notification);
      }
    });
  });

/* Uncomment and comment regular registration below */
// import Storybook from './.storybook';
// AppRegistry.registerComponent(name, () => Storybook);

/**
 * Application entry point responsible for registering root component
 */
AppRegistry.registerComponent(name, () =>
  // Disable Sentry for E2E tests
  isTest ? Root : Sentry.wrap(Root),
);
