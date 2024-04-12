/* eslint-disable import/prefer-default-export */
import notifee from '@notifee/react-native';
import { STORAGE_IDS } from './settings/storage/constants';

export async function setupAndroidChannels() {
  await notifee.createChannel({
    id: STORAGE_IDS.ANDROID_DEFAULT_CHANNEL_ID,
    name: 'Default',
  });
}
