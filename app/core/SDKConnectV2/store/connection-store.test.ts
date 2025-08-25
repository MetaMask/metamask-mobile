import { ConnectionStore } from './connection-store';
import { PersistedConnection } from '../types/persisted-connection';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

describe('ConnectionStore', () => {
  let store: ConnectionStore;
  const TEST_PREFIX = 'test-prefix';

  beforeEach(() => {
    jest.clearAllMocks();
    store = new ConnectionStore(TEST_PREFIX);
  });

  it('should create an instance with a properly formatted prefix', () => {
    expect(store).toBeDefined();
    const storeWithSlash = new ConnectionStore('prefix/');
    expect(storeWithSlash).toBeDefined();
  });

  it('should save a connection', async () => {
    const connection: PersistedConnection = {
      id: 'test-id',
      dappMetadata: {
        name: 'Test DApp',
        url: 'https://example.com',
        icon: 'https://example.com/icon.png',
      },
    };

    await store.save(connection);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'test-prefix/test-id',
      JSON.stringify(connection),
    );
  });

  it('should get a connection by id', async () => {
    const connection: PersistedConnection = {
      id: 'test-id',
      dappMetadata: {
        name: 'Test DApp',
        url: 'https://example.com',
      },
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(connection),
    );

    const result = await store.get('test-id');

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('test-prefix/test-id');
    expect(result).toEqual(connection);
  });

  it('should return null when connection not found', async () => {
    const result = await store.get('non-existent');

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('test-prefix/non-existent');
    expect(result).toBeNull();
  });

  it('should list all connections', async () => {
    const connections: PersistedConnection[] = [
      {
        id: 'id1',
        dappMetadata: { name: 'DApp 1', url: 'https://dapp1.com' },
      },
      {
        id: 'id2',
        dappMetadata: { name: 'DApp 2', url: 'https://dapp2.com' },
      },
    ];

    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      'test-prefix/id1',
      'test-prefix/id2',
      'other-prefix/id3',
    ]);

    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['test-prefix/id1', JSON.stringify(connections[0])],
      ['test-prefix/id2', JSON.stringify(connections[1])],
    ]);

    const result = await store.list();

    expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
    expect(AsyncStorage.multiGet).toHaveBeenCalledWith([
      'test-prefix/id1',
      'test-prefix/id2',
    ]);
    expect(result).toEqual(connections);
  });

  it('should return empty array when no connections exist', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([]);

    const result = await store.list();

    expect(result).toEqual([]);
    expect(AsyncStorage.multiGet).not.toHaveBeenCalled();
  });

  it('should delete a connection', async () => {
    await store.delete('test-id');

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('test-prefix/test-id');
  });
});
