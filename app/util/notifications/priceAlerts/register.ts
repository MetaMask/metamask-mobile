import notifee from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import Logger from '../../Logger';
import {
  onBackgroundPriceAlertMessage,
  onPriceAlertEvent,
  registerPriceAlertCategory,
} from './notifications';

export function registerPriceAlertNotifications() {
  notifee.onForegroundEvent(onPriceAlertEvent);
  notifee.onBackgroundEvent(onPriceAlertEvent);
  if (Platform.OS === 'android') {
    messaging().setBackgroundMessageHandler(onBackgroundPriceAlertMessage);
  } else {
    registerPriceAlertCategory().catch((error: unknown) => {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Failed to register the iOS price alert notification category',
      );
    });
  }

  if (__DEV__) {
    Object.assign(globalThis, {
      showPriceAlertSample: async (
        ...args: Parameters<
          typeof import('./samples/demo').showPriceAlertSample
        >
      ) => {
        const { showPriceAlertSample } = await import('./samples/demo');
        await showPriceAlertSample(...args);
      },
    });
  }
}
