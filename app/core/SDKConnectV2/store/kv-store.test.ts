import { KVStore } from './kv-store';
import StorageWrapper from '../../../store/storage-wrapper';

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

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

    expect(StorageWrapper.setItem).toHaveBeenCalledTimes(1);
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      expectedPrefixedKey,
      value,
    );
  });

  it('should correctly prefix the key when getting an item', async () => {
    const key = 'my-key';
    const expectedValue = 'retrieved-value';
    const expectedPrefixedKey = `${TEST_PREFIX}${key}`;

    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(expectedValue);

    const result = await store.get(key);

    expect(StorageWrapper.getItem).toHaveBeenCalledTimes(1);
    expect(StorageWrapper.getItem).toHaveBeenCalledWith(expectedPrefixedKey);
    expect(result).toBe(expectedValue);
  });

  it('should return null if the item does not exist', async () => {
    const key = 'non-existent-key';
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(null);
    const result = await store.get(key);
    expect(result).toBeNull();
  });

  it('should correctly prefix the key when deleting an item', async () => {
    const key = 'my-key-to-delete';
    const expectedPrefixedKey = `${TEST_PREFIX}${key}`;

    await store.delete(key);

    expect(StorageWrapper.removeItem).toHaveBeenCalledTimes(1);
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(expectedPrefixedKey);
  });
});
