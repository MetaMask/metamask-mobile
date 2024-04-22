import { MMKV } from 'react-native-mmkv';
import { STORAGE_TYPES, STORAGE_IDS, mapStorageTypeToIds } from './constants';

export const notificationSettingsStorage = new MMKV({
  id: STORAGE_IDS.NOTIFICATIONS,
});

export class mmStorage {
  static getLocal(key: string) {
    if (!key) {
      return;
    }

    const keyType = mapStorageTypeToIds(key);

    switch (keyType) {
      case STORAGE_TYPES.STRING:
        return notificationSettingsStorage.getString(key);
      case STORAGE_TYPES.NUMBER:
        return notificationSettingsStorage.getNumber(key);
      case STORAGE_TYPES.BOOLEAN:
        return notificationSettingsStorage.getBoolean(key);
      case STORAGE_TYPES.OBJECT:
        return JSON.parse(notificationSettingsStorage.getString(key) || '{}');
      default:
        return notificationSettingsStorage.getString(key);
    }
  }

  static saveLocal(key: string, value: any) {
    if (!key) {
      return;
    }
    const valueType = typeof value;

    if (valueType === 'object') {
      return notificationSettingsStorage.set(key, JSON.stringify(value));
    }

    return notificationSettingsStorage.set(key, value);
  }

  static clearAllStorages() {
    Object.keys(STORAGE_IDS).forEach((id) => {
      const storage = new MMKV({ id });
      storage.clearAll();
    });

    const defaultStorage = new MMKV();
    defaultStorage.clearAll();
  }
}
