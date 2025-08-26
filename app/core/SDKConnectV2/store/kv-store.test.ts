import { KVStore } from './kv-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('KVStore', () => {
  let store: KVStore;
  const TEST_PREFIX = 'test-kv-prefix/';

  beforeEach(() => {
    jest.clearAllMocks();
    store = new KVStore(TEST_PREFIX);
  });

  it('should correctly prefix the key when setting an item', async () => {
    const key = 'my-key';
    const value = 'my-value';
    const expectedPrefixedKey = `${TEST_PREFIX}${key}`;

    await store.set(key, value);

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expectedPrefixedKey,
      value,
    );
  });

  it('should correctly prefix the key when getting an item', async () => {
    const key = 'my-key';
    const expectedValue = 'retrieved-value';
    const expectedPrefixedKey = `${TEST_PREFIX}${key}`;

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(expectedValue);

    const result = await store.get(key);

    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(expectedPrefixedKey);
    expect(result).toBe(expectedValue);
  });

  it('should return null if the item does not exist', async () => {
    const key = 'non-existent-key';
    const result = await store.get(key);
    expect(result).toBeNull();
  });

  it('should correctly prefix the key when deleting an item', async () => {
    const key = 'my-k	ey-to-delete';
    const expectedPrefixedKey = `${TEST_PREFIX}${key}`;

    await store.delete(key);

    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(expectedPrefixedKey);
  });
});
