import { cleanup } from '@testing-library/react-native';
import { MMKV } from 'react-native-mmkv';
import messaging from '@react-native-firebase/messaging';
import FCMService from './FCMService';
import { mmStorage, notificationStorage } from '../settings';
import Logger from '../../../util/Logger';

jest.mock('../../../core/NotificationManager');
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

jest.mock('../methods', () => ({
  parseNotification: jest.fn(),
}));

const mockedOnTokenRefresh = jest.fn((callback) => callback('fcmToken'));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    onTokenRefresh: mockedOnTokenRefresh,
    getToken: jest.fn(() => Promise.resolve('fcmToken')),
    deleteToken: jest.fn(() => Promise.resolve()),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
    hasPermission: jest.fn(() => Promise.resolve(1)),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    setBackgroundMessageHandler: jest.fn(() => Promise.resolve()),
    isDeviceRegisteredForRemoteMessages: jest.fn(() => Promise.resolve(false)),
    registerDeviceForRemoteMessages: jest.fn(() =>
      Promise.resolve('registered'),
    ),
    unregisterDeviceForRemoteMessages: jest.fn(() =>
      Promise.resolve('unregistered'),
    ),
    onMessage: jest.fn(() => jest.fn())
  }))
}));

jest.mock('../settings', () => ({
  mmStorage: {
    saveLocal: jest.fn(),
    getLocal: jest.fn().mockReturnValue({ data: 'fcmToken' }),
  },
  notificationStorage: {
    set: jest.fn(),
    getString: jest.fn(),
  },
}));

jest.mock('../../../core/NotificationManager', () => ({
  onMessageReceived: jest.fn(),
}));

describe('FCMService', () => {
  let storage: MMKV;

  afterEach(cleanup);
  beforeAll(() => {
    storage = notificationStorage;
    jest.clearAllMocks();
  });

  it('gets local storage token correctly', () => {
    const mockKey = 'metaMaskFcmToken';
    const mockValue = { data: 'fcmToken' };

    storage.set(mockKey, JSON.stringify(mockValue));
    storage.getString(mockKey);

    const result = mmStorage.getLocal(mockKey);

    expect(result).toEqual(mockValue);
  });

  it('gets FCM token', async () => {
    const mockToken = 'fcmToken';

    const token = await FCMService.getFCMToken();
    expect(token).toBe(mockToken);
  });

  it('logs if FCM token is not found', async () => {
    const mockKey = 'metaMaskFcmToken';
    const mockValue = { data: undefined };

    const getLocalMock = jest.spyOn(mmStorage, 'getLocal').mockReturnValue(undefined);

    storage.set(mockKey, JSON.stringify(mockValue));
    storage.getString(mockKey);

    await FCMService.getFCMToken();
    expect(Logger.log).toHaveBeenCalledWith('getFCMToken: No FCM token found');

    getLocalMock.mockRestore();
  });

  it('saves FCM token', async () => {
    const mockKey = 'metaMaskFcmToken';
    const mockValue = { data: 'fcmToken' };

    storage.set(mockKey, JSON.stringify(mockValue));
    storage.getString(mockKey);

    await FCMService.saveFCMToken();
    expect(mmStorage.saveLocal).toHaveBeenCalled();
  });

  it('saves FCM token if permissionStatus === messaging.AuthorizationStatus.AUTHORIZED', async () => {
    const mockToken = 'fcmToken';
    (messaging().requestPermission as jest.Mock).mockResolvedValue(1);
    (messaging().getToken as jest.Mock).mockResolvedValue(mockToken);

    await FCMService.saveFCMToken();
    expect(mmStorage.saveLocal).toHaveBeenCalledWith('metaMaskFcmToken', { data: mockToken });
  });

  it('saves FCM token if permissionStatus === messaging.AuthorizationStatus.PROVISIONAL', async () => {
    const mockToken = 'fcmToken';
    (messaging().requestPermission as jest.Mock).mockResolvedValue(2);
    (messaging().getToken as jest.Mock).mockResolvedValue(mockToken);

    await FCMService.saveFCMToken();
    expect(mmStorage.saveLocal).toHaveBeenCalledWith('metaMaskFcmToken', { data: mockToken });
  });
});
