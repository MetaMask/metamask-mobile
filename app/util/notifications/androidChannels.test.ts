import { AndroidImportance } from '@notifee/react-native';
import {
  ChannelId,
  MetaMaskAndroidChannel,
  notificationChannels,
} from './androidChannels';

describe('notificationChannels', () => {
  it('should have two channels', () => {
    expect(notificationChannels).toHaveLength(2);
  });

  it('should have the correct properties for the first channel', () => {
    const firstChannel: MetaMaskAndroidChannel = notificationChannels[0];
    expect(firstChannel).toEqual({
      id: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
      name: 'Transaction Complete',
      lights: false,
      vibration: false,
      importance: AndroidImportance.DEFAULT,
      title: 'Transaction',
      subtitle: 'Transaction Complete',
    });
  });

  it('should have the correct properties for the second channel', () => {
    const secondChannel: MetaMaskAndroidChannel = notificationChannels[1];
    expect(secondChannel).toEqual({
      id: ChannelId.ANNOUNCEMENT_NOTIFICATION_CHANNEL_ID,
      name: 'MetaMask Announcement',
      lights: false,
      vibration: false,
      importance: AndroidImportance.DEFAULT,
      title: 'Announcement',
      subtitle: 'MetaMask Announcement',
    });
  });

  it('should have unique titles for each channel', () => {
    const titles = notificationChannels.map((channel) => channel.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it('should have unique subtitles for each channel', () => {
    const subtitles = notificationChannels.map((channel) => channel.subtitle);
    const uniqueSubtitles = new Set(subtitles);
    expect(uniqueSubtitles.size).toBe(subtitles.length);
  });
});
