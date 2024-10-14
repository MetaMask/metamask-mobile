import { AndroidChannel, AndroidImportance } from '@notifee/react-native';

export interface MetaMaskAndroidChannel extends AndroidChannel {
  id: string;
  title: string;
  subtitle: string;
}

export const notificationChannels = [
  {
    id: 'DEFAULT_NOTIFICATION_CHANNEL_ID',
    name: 'Transaction Complete',
    lights: true,
    vibration: true,
    importance: AndroidImportance.HIGH,
    title: 'Transaction',
    subtitle: 'Transaction Complete',
  } as MetaMaskAndroidChannel,
  {
    id: 'ANNOUNCEMENT_NOTIFICATION_CHANNEL_ID',
    name: 'MetaMask Announcement',
    lights: true,
    vibration: true,
    importance: AndroidImportance.HIGH,
    title: 'Announcement',
    subtitle: 'MetaMask Announcement',
  } as MetaMaskAndroidChannel,
];
