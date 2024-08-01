import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { Alert } from 'react-native';

import { strings } from '../../../locales/i18n';
import Device from '../device';
import { mmStorage } from './settings';
import { STORAGE_IDS } from './settings/storage/constants';
import Logger from '../Logger';

export const requestPushNotificationsPermission = async () => {
  let permissionStatus;

  const promptCount = mmStorage.getLocal(
    STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
  );

  try {
    permissionStatus = await notifee.requestPermission();

    if (permissionStatus.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
      const times = promptCount + 1 || 1;

      Alert.alert(
        strings('notifications.prompt_title'),
        strings('notifications.prompt_desc'),
        [
          {
            text: strings('notifications.prompt_cancel'),
            onPress: () => {
              mmStorage.saveLocal(
                STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
                times,
              );
              mmStorage.saveLocal(
                STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_TIME,
                Date.now().toString(),
              );
            },
            style: 'default',
          },
          {
            text: strings('notifications.prompt_ok'),
            onPress: async () => {
              if (Device.isIos()) {
                permissionStatus = await notifee.requestPermission({
                  provisional: true,
                });
              } else {
                permissionStatus = await notifee.requestPermission();
              }
            },
          },
        ],
        { cancelable: false },
      );
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
