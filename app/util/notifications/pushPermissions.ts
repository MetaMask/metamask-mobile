import notifee, {
  AuthorizationStatus,
  NotificationSettings,
} from '@notifee/react-native';
import { Linking, Alert as NativeAlert, Platform } from 'react-native';
import { strings } from '../../../locales/i18n';
import { mmStorage } from './settings';
import { STORAGE_IDS } from './settings/storage/constants';
import Logger from '../Logger';
import Device from '../device';
import { store } from '../../store';

interface AlertButton {
  text: string;
  onPress: () => void | Promise<void>;
}

export const openSystemSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openSettings();
  } else {
    notifee.openNotificationSettings();
  }
};

export const isDeviceNotificationEnabled = async () => {
  const settings = await notifee.getNotificationSettings();
  switch (settings.authorizationStatus) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
      store.dispatch({
        type: 'TOGGLE_DEVICE_NOTIFICATIONS',
        deviceNotificationEnabled: true,
      });
      return true;
    default:
      store.dispatch({
        type: 'TOGGLE_DEVICE_NOTIFICATIONS',
        deviceNotificationEnabled: false,
      });
      return false;
  }
};

const defaultButtons = (resolve: (value: boolean) => void): AlertButton[] => [
  {
    text: strings('notifications.prompt_cancel'),
    onPress: () => {
      const promptCount = mmStorage.getLocal(
        STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
      );
      mmStorage.saveLocal(
        STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
        promptCount + 1,
      );
      mmStorage.saveLocal(
        STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_TIME,
        Date.now().toString(),
      );

      resolve(false);
    },
  },
  {
    text: strings('notifications.prompt_ok'),
    onPress: async () => {
      openSystemSettings();
      resolve(true);
    },
  },
];

export const asyncAlert = (
  title: string,
  msg: string,
  getButtons: (
    resolve: (value: boolean) => void,
  ) => AlertButton[] = defaultButtons,
): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    NativeAlert.alert(title, msg, getButtons(resolve), {
      cancelable: false,
    });
  });

export const requestPushNotificationsPermission = async (
  alertFunction: typeof asyncAlert = asyncAlert,
): Promise<NotificationSettings | undefined> => {
  let permissionStatus: NotificationSettings | undefined;
  permissionStatus = await notifee.getNotificationSettings();
  if (
    permissionStatus.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    permissionStatus.authorizationStatus === AuthorizationStatus.PROVISIONAL
  ) {
    return permissionStatus;
  }
  try {
    await alertFunction(
      strings('notifications.prompt_title'),
      strings('notifications.prompt_desc'),
    );

    if (Device.isIos()) {
      permissionStatus = await notifee.requestPermission({
        provisional: true,
      });
    } else {
      permissionStatus = await notifee.requestPermission();
    }

    return permissionStatus;
  } catch (e) {
    if (e instanceof Error) {
      Logger.error(e, strings('notifications.error_checking_permission'));
    } else {
      Logger.error(
        new Error(strings('notifications.error_checking_permission')),
      );
    }
  }
};

export default requestPushNotificationsPermission;
