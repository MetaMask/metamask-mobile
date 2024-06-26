import {
  checkPlayServices,
  registerAppWithFCM,
  unRegisterAppWithFCM,
  checkApplicationNotificationPermission,
  getFcmToken,
} from './fcmHelper';

jest.mock('@react-native-firebase/app', () => ({
  utils: () => ({
    playServicesAvailability: {
      status: 1,
      isAvailable: false,
      hasResolution: true,
      isUserResolvableError: true,
    },
    makePlayServicesAvailable: jest.fn(() => Promise.resolve()),
    resolutionForPlayServices: jest.fn(() => Promise.resolve()),
    promptForPlayServices: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => ({
    isDeviceRegisteredForRemoteMessages: false,
    registerDeviceForRemoteMessages: jest.fn(() =>
      Promise.resolve('registered'),
    ),
    unregisterDeviceForRemoteMessages: jest.fn(() =>
      Promise.resolve('unregistered'),
    ),
    deleteToken: jest.fn(() => Promise.resolve()),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    getToken: jest.fn(() => Promise.resolve('fcm-token')),
    AuthorizationStatus: {
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    },
  }),
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
  },
  request: jest.fn(() => Promise.resolve('granted')),
}));

describe('Firebase and Permission Functions', () => {
  test('should test multiple functions for coverage', async () => {
    await checkPlayServices();
    await registerAppWithFCM();
    await unRegisterAppWithFCM();
    await checkApplicationNotificationPermission();
    const token = await getFcmToken();

    expect(token).toBe('fcm-token');
  });
});
