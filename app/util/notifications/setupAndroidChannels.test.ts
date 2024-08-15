/* eslint-disable import/prefer-default-export */
import notifee, { AndroidImportance } from '@notifee/react-native';
import { setupAndroidChannel } from './setupAndroidChannels';
import { STORAGE_IDS } from './settings/storage/constants';

jest.mock('@notifee/react-native');
const mockedNotifee = jest.mocked(notifee);

describe('setupAndroidChannel', () => {
  beforeEach(() => {
    mockedNotifee.createChannel.mockClear();
  });

  it('should create android channel', async () => {
    await setupAndroidChannel();

    expect(mockedNotifee.createChannel).toHaveBeenCalledTimes(1);
    expect(mockedNotifee.createChannel).toHaveBeenCalledWith({
      id: STORAGE_IDS.ANDROID_DEFAULT_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      name: 'Default',
      badge: false,
    });
  });
});
