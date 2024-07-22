import FilesystemStorage from 'redux-persist-filesystem-storage';
import { captureException } from '@sentry/react-native';
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export default async function migrate(state: unknown) {
  try {
    await FilesystemStorage.clear();
  } catch (error) {
    captureException(
      `Failed to clean data from filesystem storage! Error: ${error}`,
    );
  }

  return state;
}
