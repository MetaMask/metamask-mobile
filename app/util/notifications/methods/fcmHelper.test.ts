import {
  checkPlayServices,
  registerAppWithFCM,
  unRegisterAppWithFCM,
  checkApplicationNotificationPermission,
  getFcmToken,
} from './fcmHelper';

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: {
    app: jest.fn(() => ({
      utils: jest.fn(() => ({
        playServicesAvailability: {
          status: 1,
        },
      })),
    })),
  },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => ({
    hasPermission: jest.fn(() => Promise.resolve(true)),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
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
  }),
  FirebaseMessagingTypes: {
    AuthorizationStatus: {
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    },
  },
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
  it('should check checkPlayServices function call for coverage', async () => {
    await checkPlayServices();
    const token = await getFcmToken();

    expect(token).toBe('fcm-token');
  });
  it('should check registerAppWithFCM function call for coverage', async () => {
    await registerAppWithFCM();

    const token = await getFcmToken();

    expect(token).toBe('fcm-token');
  });
  it('should check unRegisterAppWithFCM function call for coverage', async () => {
    await unRegisterAppWithFCM();
    const token = await getFcmToken();

    expect(token).toBe('fcm-token');
  });
  it('should check checkApplicationNotificationPermission function call for coverage', async () => {
    await checkApplicationNotificationPermission();
    const token = await getFcmToken();

    expect(token).toBe('fcm-token');
  });
});
