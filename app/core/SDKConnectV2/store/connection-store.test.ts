import { ConnectionStore } from './connection-store';
import { ConnectionInfo } from '../types/connection-info';
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
    const connection: ConnectionInfo = {
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
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
    };

    await store.save(connection);

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'test-prefix/test-id',
      JSON.stringify(connection),
    );
  });

  it('should get a connection by id', async () => {
    const connection: ConnectionInfo = {
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
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
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

  it('should return null and delete expired connection', async () => {
    const expiredConnection: ConnectionInfo = {
      id: 'expired-id',
      metadata: {
        dapp: {
          name: 'Expired DApp',
          url: 'https://expired.com',
          icon: 'https://expired.com/icon.png',
        },
        sdk: {
          version: '1.0.0',
          platform: 'ios',
        },
      },
      expiresAt: Date.now() - 1000, // Already expired
    };

    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(expiredConnection),
    );

    const result = await store.get('expired-id');

    expect(StorageWrapper.getItem).toHaveBeenCalledWith('test-prefix/expired-id');
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith('test-prefix/expired-id');
    expect(result).toBeNull();
  });

  it('should return null and delete corrupted connection data', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
      'invalid json data',
    );

    const result = await store.get('corrupted-id');

    expect(StorageWrapper.getItem).toHaveBeenCalledWith('test-prefix/corrupted-id');
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith('test-prefix/corrupted-id');
    expect(result).toBeNull();
  });

  it('should list all connections', async () => {
    const connections: ConnectionInfo[] = [
      {
        id: 'id1',
        metadata: {
          dapp: { name: 'DApp 1', url: 'https://dapp1.com' },
          sdk: { version: '1.0.0', platform: 'ios' },
        },
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
      },
      {
        id: 'id2',
        metadata: {
          dapp: { name: 'DApp 2', url: 'https://dapp2.com' },
          sdk: { version: '1.0.0', platform: 'ios' },
        },
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
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

  it('should filter out expired connections from list', async () => {
    const validConnection: ConnectionInfo = {
      id: 'valid-id',
      metadata: {
        dapp: { name: 'Valid DApp', url: 'https://valid.com' },
        sdk: { version: '1.0.0', platform: 'ios' },
      },
      expiresAt: Date.now() + 1000 * 60 * 60, // Valid for 1 hour
    };

    const expiredConnection: ConnectionInfo = {
      id: 'expired-id',
      metadata: {
        dapp: { name: 'Expired DApp', url: 'https://expired.com' },
        sdk: { version: '1.0.0', platform: 'ios' },
      },
      expiresAt: Date.now() - 1000, // Already expired
    };

    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      'test-prefix/valid-id',
      'test-prefix/expired-id',
    ]);

    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['test-prefix/valid-id', JSON.stringify(validConnection)],
      ['test-prefix/expired-id', JSON.stringify(expiredConnection)],
    ]);

    const result = await store.list();

    expect(result).toEqual([validConnection]);
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith('test-prefix/expired-id');
    expect(StorageWrapper.removeItem).toHaveBeenCalledTimes(1);
  });

  it('should filter out corrupted connections from list', async () => {
    const validConnection: ConnectionInfo = {
      id: 'valid-id',
      metadata: {
        dapp: { name: 'Valid DApp', url: 'https://valid.com' },
        sdk: { version: '1.0.0', platform: 'ios' },
      },
      expiresAt: Date.now() + 1000 * 60 * 60, // Valid for 1 hour
    };

    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      'test-prefix/valid-id',
      'test-prefix/corrupted-id',
    ]);

    (AsyncStorage.multiGet as jest.Mock).mockResolvedValueOnce([
      ['test-prefix/valid-id', JSON.stringify(validConnection)],
      ['test-prefix/corrupted-id', 'invalid json'],
    ]);

    const result = await store.list();

    expect(result).toEqual([validConnection]);
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith('test-prefix/corrupted-id');
    expect(StorageWrapper.removeItem).toHaveBeenCalledTimes(1);
  });

  it('should delete a connection', async () => {
    await store.delete('test-id');

    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      'test-prefix/test-id',
    );
  });
});
