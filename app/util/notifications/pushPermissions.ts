import notifee, {
  AuthorizationStatus,
  NotificationSettings,
} from '@notifee/react-native';
import { Alert as NativeAlert } from 'react-native';

import { strings } from '../../../locales/i18n';
import Device from '../device';
import { mmStorage } from './settings';
import { STORAGE_IDS } from './settings/storage/constants';
import Logger from '../Logger';

interface AlertButton {
  text: string;
  onPress: () => void | Promise<void>;
}

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
      if (Device.isIos()) {
        await notifee.requestPermission({
          provisional: true,
        });
      } else {
        await notifee.requestPermission();
      }
      resolve(true);
    },
  },
];

const AsyncAlert = (
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

export const requestPushNotificationsPermission = async (): Promise<
  NotificationSettings | undefined
> => {
  const permissionStatus = await notifee.getNotificationSettings();

  if (permissionStatus.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
    return permissionStatus;
  }
  try {
    await AsyncAlert(
      strings('notifications.prompt_title'),
      strings('notifications.prompt_desc'),
    );

    return await notifee.getNotificationSettings();
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
