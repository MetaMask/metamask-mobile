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
    jest.clearAllMocks();
  });

  it('gets FCM token', async () => {
    const mockToken = 'test-token';
    (mmStorage.getLocal as jest.Mock).mockResolvedValue({ data: mockToken });

    const token = await FCMService.getFCMToken();
    expect(token).toBe(mockToken);
  });

  it('gets Logged if FCM token is not found', async () => {
    const mockToken = undefined;
    (mmStorage.getLocal as jest.Mock).mockResolvedValue({ data: mockToken });

    await FCMService.getFCMToken();
    expect(Logger.log).toHaveBeenCalledWith('getFCMToken: No FCM token found');
  });

  it('saves FCM token', async () => {
    const mockToken = 'fcmToken';
    (messaging().requestPermission as jest.Mock).mockResolvedValue(messaging.AuthorizationStatus.PROVISIONAL);
    (messaging().getToken as jest.Mock).mockResolvedValue({ data: mockToken });

    await FCMService.saveFCMToken();
    expect(mmStorage.saveLocal).toHaveBeenCalledWith('metaMaskFcmToken', { data: mockToken });
  });

  it('saves FCM token if permissionStatus === messaging.AuthorizationStatus.AUTHORIZED', async () => {
    const mockToken = 'fcmToken';
    (messaging().requestPermission as jest.Mock).mockResolvedValue(messaging.AuthorizationStatus.AUTHORIZED);
    (messaging().getToken as jest.Mock).mockResolvedValue(mockToken);

    await FCMService.saveFCMToken();
    expect(mmStorage.saveLocal).toHaveBeenCalledWith('metaMaskFcmToken', { data: mockToken });
  });

  it('does not save the FCM token when onTokenRefresh is called', async () => {
    const mockToken = 'fcmToken';
    const saveLocalMock =  (mmStorage.saveLocal as jest.Mock).mockImplementation(jest.fn());

    const onTokenRefreshMock = jest.fn();
    (messaging().onTokenRefresh as jest.Mock).mockImplementation((callback) => {
      onTokenRefreshMock.mockImplementation(callback);
    });

    FCMService.registerTokenRefreshListener();

    onTokenRefreshMock(mockToken);

    expect(saveLocalMock).not.toHaveBeenCalled();

  });
});
