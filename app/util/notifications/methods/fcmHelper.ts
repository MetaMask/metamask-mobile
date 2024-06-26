/* eslint-disable no-console */
import { utils } from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
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
  console.log(
    'registerAppWithFCM status',
    messaging().isDeviceRegisteredForRemoteMessages,
  );
  if (!messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging()
      .registerDeviceForRemoteMessages()
      .then((status: unknown) => {
        console.log('registerDeviceForRemoteMessages status', status);
      })
      .catch((error: unknown) => {
        console.log('registerDeviceForRemoteMessages error ', error);
      });
  }
}

export async function unRegisterAppWithFCM() {
  console.log(
    'unRegisterAppWithFCM status',
    messaging().isDeviceRegisteredForRemoteMessages,
  );

  if (messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging()
      .unregisterDeviceForRemoteMessages()
      .then((status: unknown) => {
        console.log('unregisterDeviceForRemoteMessages status', status);
      })
      .catch((error: unknown) => {
        console.log('unregisterDeviceForRemoteMessages error ', error);
      });
  }
  await messaging().deleteToken();
  console.log(
    'unRegisterAppWithFCM status',
    messaging().isDeviceRegisteredForRemoteMessages,
  );
}

export const checkApplicationNotificationPermission = async () => {
  const authStatus = await messaging().requestPermission();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const enabled = authStatus === 'AUTHORIZED' || authStatus === 'PROVISIONAL';

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
  request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS)
    .then((result) => {
      console.log('POST_NOTIFICATIONS status:', result);
    })
    .catch((error: unknown) => {
      console.log('POST_NOTIFICATIONS error ', error);
    });
};

export const getFcmToken = async () => {
  let token = null;
  await checkApplicationNotificationPermission();
  await registerAppWithFCM();
  try {
    token = await messaging().getToken();
    console.log('getFcmToken-->', token);
  } catch (error) {
    console.log('getFcmToken Device Token error ', error);
  }
  return token;
};
