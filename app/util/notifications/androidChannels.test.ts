import { AndroidImportance } from '@notifee/react-native';
import {
  ChannelId,
  MetaMaskAndroidChannel,
  notificationChannels,
} from './androidChannels';

describe('notificationChannels', () => {
  it('contains two channels', () => {
    expect(notificationChannels).toHaveLength(2);
  });

  it('first channel has DEFAULT_NOTIFICATION_CHANNEL_ID', () => {
    const firstChannel: MetaMaskAndroidChannel = notificationChannels[0];
    expect(firstChannel).toEqual({
      id: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
      name: 'Transaction Complete',
      lights: true,
      vibration: true,
      importance: AndroidImportance.HIGH,
      title: 'Transaction',
      subtitle: 'Transaction Complete',
    });
  });

  it('second channel should have the correct properties for DEFAULT_NOTIFICATION_CHANNEL_ID', () => {
    const secondChannel: MetaMaskAndroidChannel = notificationChannels[1];
    expect(secondChannel).toEqual({
      id: ChannelId.ANNOUNCEMENT_NOTIFICATION_CHANNEL_ID,
      name: 'MetaMask Announcement',
      lights: true,
      vibration: true,
      importance: AndroidImportance.HIGH,
      title: 'Announcement',
      subtitle: 'MetaMask Announcement',
    });
  });

  it('channels have unique titles', () => {
    const titles = notificationChannels.map((channel) => channel.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it('channels have unique subtitles ', () => {
    const subtitles = notificationChannels.map((channel) => channel.subtitle);
    const uniqueSubtitles = new Set(subtitles);
    expect(uniqueSubtitles.size).toBe(subtitles.length);
  });
});
