import { ConnectionStore } from './connection-store';
import { PersistedConnection } from '../types/persisted-connection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageWrapper from '../../../store/storage-wrapper';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../store/storage-wrapper', () => ({
    __esModule: true,
    default: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    },
  }));

describe('ConnectionStore', () => {
  let store: ConnectionStore;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new ConnectionStore('test-prefix');
  });

  it('should create an instance with a properly formatted prefix', () => {
    expect(store).toBeDefined();
    const storeWithSlash = new ConnectionStore('prefix/');
    expect(storeWithSlash).toBeDefined();
  });

  it('should save a connection', async () => {
    const connection: PersistedConnection = {
      id: 'test-id',
      metadata: {
        dapp: {
          name: 'Test DApp',
          url: 'https://example.com',
          icon: 'https://example.com/icon.png',
        },
        sdk: {
          version: '1.0.0',
          platform: 'ios',
        },
      },
    };

    await store.save(connection);

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'test-prefix/test-id',
      JSON.stringify(connection),
    );
  });

  it('should get a connection by id', async () => {
    const connection: PersistedConnection = {
      id: 'test-id',
      metadata: {
        dapp: {
          name: 'Test DApp',
          url: 'https://example.com',
          icon: 'https://example.com/icon.png',
        },
        sdk: {
          version: '1.0.0',
          platform: 'ios',
        },
      },
    };

    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(connection),
    );

    const result = await store.get('test-id');

    expect(StorageWrapper.getItem).toHaveBeenCalledWith('test-prefix/test-id');
    expect(result).toEqual(connection);
  });

  it('should return null when connection not found', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(null);
    const result = await store.get('non-existent');

    expect(StorageWrapper.getItem).toHaveBeenCalledWith(
      'test-prefix/non-existent',
    );
    expect(result).toBeNull();
  });

  it('should list all connections', async () => {
    const connections: PersistedConnection[] = [
      {
        id: 'id1',
        metadata: {
          dapp: { name: 'DApp 1', url: 'https://dapp1.com' },
          sdk: { version: '1.0.0', platform: 'ios' },
        },
      },
      {
        id: 'id2',
        metadata: {
          dapp: { name: 'DApp 2', url: 'https://dapp2.com' },
          sdk: { version: '1.0.0', platform: 'ios' },
        },
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

    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      'test-prefix/test-id',
    );
  });
});
