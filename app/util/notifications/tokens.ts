import messaging from '@react-native-firebase/messaging';

import { mmStorage } from './settings/storage';
import { getPermissionStatus } from './permissions';
import Logger from '../Logger';
import { strings } from 'locales/i18n';
import { STORAGE_IDS } from './settings/storage/constants';

export const registerTokenRefreshListener = () => {
  const { saveLocal } = mmStorage();
  messaging().onTokenRefresh((fcmToken) => {
    saveLocal('metaMaskFcmToken', { data: fcmToken });
  });
};

export const saveFCMToken = async () => {
  try {
    const { saveLocal } = mmStorage();
    const permissionStatus = await getPermissionStatus();
    if (
      permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      permissionStatus === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        saveLocal(STORAGE_IDS.MM_FCM_TOKEN, { data: fcmToken });
      }
    }
  } catch (e) {
    Logger.error(strings('notifications.error_retrieving_fcm_token'), {
      e,
    });
  }
};

export async function getFCMToken(): Promise<string | undefined> {
  const { getLocal } = mmStorage();
  const fcmTokenLocal = await getLocal(STORAGE_IDS.MM_FCM_TOKEN);
  const token = fcmTokenLocal?.data || undefined;

  if (!token) {
    Logger.message(strings('notifications.error_fcm_not_found'));
  }

  return token;
}
