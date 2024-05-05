import { MMKV } from 'react-native-mmkv';
import { notificationStorage, mmStorage } from './index';

describe('mmStorage', () => {
  let storage: MMKV;

  beforeAll(() => {
    storage = notificationStorage;
  });

  it('should get local storage correctly', () => {
    const mockKey = 'testKey';
    const mockValue = 'testValue';

    storage.set(mockKey, mockValue);
    storage.getString(mockKey);

    const result = mmStorage.getLocal(mockKey);

    expect(result).toEqual(mockValue);
  });

  it('should save local storage correctly', () => {
    const mockKey = 'testKey';
    const mockValue = 'testValue';

    mmStorage.saveLocal(mockKey, mockValue);

    expect(mmStorage.getLocal(mockKey)).toEqual(mockValue);
  });
});
