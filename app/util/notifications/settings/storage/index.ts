import { MMKV } from 'react-native-mmkv';
import { STORAGE_TYPES, STORAGE_IDS, mapStorageTypeToIds } from './constants';

export const notificationStorage = new MMKV({
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
        return notificationStorage.getString(key);
      case STORAGE_TYPES.NUMBER:
        return notificationStorage.getNumber(key);
      case STORAGE_TYPES.BOOLEAN:
        return notificationStorage.getBoolean(key);
      case STORAGE_TYPES.OBJECT:
        return JSON.parse(notificationStorage.getString(key) || '{}');
      default:
        return notificationStorage.getString(key);
    }
  }

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static saveLocal(key: string, value: any) {
    if (!key) {
      return;
    }
    const valueType = typeof value;

    if (valueType === 'object') {
      return notificationStorage.set(key, JSON.stringify(value));
    }

    return notificationStorage.set(key, value);
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
