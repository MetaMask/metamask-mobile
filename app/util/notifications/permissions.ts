import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { strings } from '../../../locales/i18n';
import { Alert } from 'react-native';
import { saveFCMToken } from './tokens';
import AppConstants from 'app/core/AppConstants';
import Logger from '../Logger';
import Device from '../device';
import { mmStorage } from './settings';
import { STORAGE_IDS } from './settings/storage/constants';

export const getPermissionStatus = () => messaging().hasPermission();

export const checkPushNotificationPermissions = async () => {
  const { saveLocal, getLocal } = mmStorage();
  try {
    const promptCount = await getLocal(
      STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
    );

    if (
      !promptCount ||
      promptCount < AppConstants.MAX_PUSH_NOTIFICATION_PROMPT_TIMES
    ) {
      const permissionStatus = await getPermissionStatus();

      if (
        permissionStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
        permissionStatus !== messaging.AuthorizationStatus.PROVISIONAL
      ) {
        Alert.alert(
          strings('notifications.prompt_title'),
          strings('notifications.prompt_desc'),
          [
            {
              text: strings('notifications.prompt_cancel'),
              onPress: () => false,
              style: 'default',
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
                await saveFCMToken();
              },
            },
          ],
          { cancelable: false },
        );
        const times: number = promptCount + 1 || 1;
        saveLocal(STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT, times);
        // In case we want to prompt again after certain time.
        saveLocal(
          STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_TIME,
          Date.now().toString(),
        );
      }
    }
  } catch (e) {
    Logger.error(e, strings('notifications.error_checking_permission'));
  }
};
