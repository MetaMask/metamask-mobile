/* eslint-disable import/prefer-default-export */
import notifee, { AndroidImportance } from '@notifee/react-native';
import { STORAGE_IDS } from './settings/storage/constants';

export async function setupAndroidChannel() {
  await notifee.createChannel({
    id: STORAGE_IDS.ANDROID_DEFAULT_CHANNEL_ID,
    importance: AndroidImportance.HIGH,
    name: 'Default',
    badge: false,
  });
}
