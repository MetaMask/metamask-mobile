import {
  checkPlayServices,
  registerAppWithFCM,
  unRegisterAppWithFCM,
  checkApplicationNotificationPermission,
  getFcmToken,
} from './fcmHelper';

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
