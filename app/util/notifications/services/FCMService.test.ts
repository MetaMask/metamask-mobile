import messaging from '@react-native-firebase/messaging';
import FCMService from './FCMService';
import { mmStorage } from '../settings';
import Logger from '../../../util/Logger';

jest.mock('../settings', () => ({
  mmStorage: {
    getLocal: jest.fn(),
    saveLocal: jest.fn(),
  },
}));

jest.mock('@react-native-firebase/messaging', () => {
  const messagingMock = {
    getToken: jest.fn(() => Promise.resolve('fcmToken')),
    deleteToken: jest.fn(() => Promise.resolve()),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
    hasPermission: jest.fn(() => Promise.resolve(1)),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    setBackgroundMessageHandler: jest.fn(() => Promise.resolve()),
    isDeviceRegisteredForRemoteMessages: jest.fn(() => Promise.resolve(false)),
    registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve('registered')),
    unregisterDeviceForRemoteMessages: jest.fn(() => Promise.resolve('unregistered')),
    onMessage: jest.fn(),
    onTokenRefresh: jest.fn(),
    AuthorizationStatus: {
      AUTHORIZED: 1,
      PROVISIONAL: 2,
      DENIED: 3,
    },
  };

  return {
    __esModule: true,
    default: () => messagingMock,
  };
});

jest.mock('../../../util/Logger');
jest.mock('./NotificationService');
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn().mockReturnValue('Mocked string'),
}));

jest.mock('../../../store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

describe('FCMService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('gets FCM token', async () => {
    const mockToken = 'fcmToken';
    (mmStorage.getLocal as jest.Mock).mockResolvedValue({ data: mockToken });

    const token = await FCMService.getFCMToken();
    expect(token).toBe(mockToken);
  });

  it('logs if FCM token is not found', async () => {
    const mockToken = undefined;
    (mmStorage.getLocal as jest.Mock).mockResolvedValue({ data: mockToken });

    await FCMService.getFCMToken();
    expect(Logger.log).toHaveBeenCalledWith('getFCMToken: No FCM token found');
  });

  it('does not save FCM token if permission is provisional', async () => {
    (messaging().hasPermission as jest.Mock).mockResolvedValue(0);
    (messaging().getToken as jest.Mock).mockResolvedValue('fcmToken');

    await FCMService.saveFCMToken();
    expect(mmStorage.saveLocal).not.toHaveBeenCalled();
  });

  it('does not save when fcmToken is undefined', async () => {
    (mmStorage.getLocal as jest.Mock).mockResolvedValue({ data: undefined });
    (messaging().getToken as jest.Mock).mockResolvedValue(undefined);

    await FCMService.saveFCMToken();
    expect(mmStorage.saveLocal).not.toHaveBeenCalled();
  });
});
