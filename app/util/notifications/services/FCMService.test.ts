import messaging from '@react-native-firebase/messaging';
import FCMService from './FCMService';
import { mmStorage } from '../settings';

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

  it('saves FCM token', async () => {
    const mockToken = 'fcmToken';
    (messaging().requestPermission as jest.Mock).mockResolvedValue(messaging.AuthorizationStatus);
    (messaging().getToken as jest.Mock).mockResolvedValue(mockToken);

    await FCMService.saveFCMToken();
    expect(mmStorage.saveLocal).toHaveBeenCalledWith('metaMaskFcmToken', { data: mockToken });
  });
});
