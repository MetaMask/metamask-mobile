import { getFcmToken } from './fcmHelper';

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('getFcmToken', () => {
  it('should get the FCM function called correctly', async () => {
    const getTokenMock = jest.fn().mockResolvedValue('fcm-token');

    await getFcmToken();
    expect(getTokenMock).toHaveBeenCalled();
  });
});
