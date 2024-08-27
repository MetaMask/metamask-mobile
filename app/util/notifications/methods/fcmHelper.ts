import { utils } from '@react-native-firebase/app';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import Logger from '../../../util/Logger';
import { PERMISSIONS, request } from 'react-native-permissions';

export async function checkPlayServices() {
  const { status, isAvailable, hasResolution, isUserResolvableError } =
    utils().playServicesAvailability;
  if (isAvailable) return Promise.resolve();

  if (isUserResolvableError || hasResolution) {
    switch (status) {
      case 1:
        return utils().makePlayServicesAvailable();
      case 2:
        return utils().resolutionForPlayServices();
      default:
        if (isUserResolvableError) return utils().promptForPlayServices();
        if (hasResolution) return utils().resolutionForPlayServices();
    }
  }
  return Promise.reject(
    new Error('Unable to find a valid play services version.'),
  );
}

export async function registerAppWithFCM() {
  Logger.log(
    'registerAppWithFCM status',
    messaging().isDeviceRegisteredForRemoteMessages,
  );
  if (!messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging()
      .registerDeviceForRemoteMessages()
      .then((status: unknown) => {
        Logger.log('registerDeviceForRemoteMessages status', status);
      })
      .catch((error: Error) => {
        Logger.error(error);
      });
  }
}

export async function unRegisterAppWithFCM() {
  Logger.log(
    'unRegisterAppWithFCM status',
    messaging().isDeviceRegisteredForRemoteMessages,
  );

  if (messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging()
      .unregisterDeviceForRemoteMessages()
      .then((status: unknown) => {
        Logger.log('unregisterDeviceForRemoteMessages status', status);
      })
      .catch((error: Error) => {
        Logger.error(error);
      });
  }
  await messaging().deleteToken();
  Logger.log(
    'unRegisterAppWithFCM status',
    messaging().isDeviceRegisteredForRemoteMessages,
  );
}

export const checkApplicationNotificationPermission = async () => {
  const authStatus = await messaging().requestPermission();

  const enabled =
    authStatus === FirebaseMessagingTypes.AuthorizationStatus.AUTHORIZED ||
    authStatus === FirebaseMessagingTypes.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    Logger.log('Authorization status:', authStatus);
  }
  request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS)
    .then((result) => {
      Logger.log('POST_NOTIFICATIONS status:', result);
    })
    .catch((error: Error) => {
      Logger.error(error);
    });
};

export const getFcmToken = async () => {
  let token = null;
  await checkApplicationNotificationPermission();
  await registerAppWithFCM();
  try {
    token = await messaging().getToken();
    Logger.log('getFcmToken-->', token);
  } catch (error: unknown) {
    Logger.error(error as Error);
  }
  return token;
};
