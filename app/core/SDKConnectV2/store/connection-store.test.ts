import { ConnectionStore } from './connection-store';
import { ConnectionInfo } from '../types/connection-info';
import StorageWrapper from '../../../store/storage-wrapper';

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

    // Mock index as empty initially
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(null);

    await store.save(connection);

    // Should update the index
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'test-prefix_index',
      JSON.stringify(['test-id']),
    );
    // Should save the connection data
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

    // First call for getting the connection, second call for reading index during delete
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(expiredConnection))
      .mockResolvedValueOnce(JSON.stringify(['expired-id']));

    const result = await store.get('expired-id');

    expect(StorageWrapper.getItem).toHaveBeenCalledWith(
      'test-prefix/expired-id',
    );
    // Should update index to remove the expired connection
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'test-prefix_index',
      JSON.stringify([]),
    );
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      'test-prefix/expired-id',
    );
    expect(result).toBeNull();
  });

  it('should return null and delete corrupted connection data', async () => {
    // First call for getting the connection, second call for reading index during delete
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce('invalid json data')
      .mockResolvedValueOnce(JSON.stringify(['corrupted-id']));

    const result = await store.get('corrupted-id');

    expect(StorageWrapper.getItem).toHaveBeenCalledWith(
      'test-prefix/corrupted-id',
    );
    // Should update index to remove the corrupted connection
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'test-prefix_index',
      JSON.stringify([]),
    );
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      'test-prefix/corrupted-id',
    );
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

    // Mock the index retrieval
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(['id1', 'id2']))
      .mockResolvedValueOnce(JSON.stringify(connections[0]))
      .mockResolvedValueOnce(JSON.stringify(connections[1]));

    const result = await store.list();

    expect(StorageWrapper.getItem).toHaveBeenCalledWith('test-prefix_index');
    expect(StorageWrapper.getItem).toHaveBeenCalledWith('test-prefix/id1');
    expect(StorageWrapper.getItem).toHaveBeenCalledWith('test-prefix/id2');
    expect(result).toEqual(connections);
  });

  it('should return empty array when no connections exist', async () => {
    // Mock empty index
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(null);

    const result = await store.list();

    expect(result).toEqual([]);
    expect(StorageWrapper.getItem).toHaveBeenCalledWith('test-prefix_index');
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

    // Mock: index, valid connection, expired connection, index during delete
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(['valid-id', 'expired-id']))
      .mockResolvedValueOnce(JSON.stringify(validConnection))
      .mockResolvedValueOnce(JSON.stringify(expiredConnection))
      .mockResolvedValueOnce(JSON.stringify(['valid-id', 'expired-id']));

    const result = await store.list();

    expect(result).toEqual([validConnection]);
    // Should update index to remove expired connection
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'test-prefix_index',
      JSON.stringify(['valid-id']),
    );
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      'test-prefix/expired-id',
    );
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

    // Mock: index, valid connection, corrupted connection, index during delete
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(['valid-id', 'corrupted-id']))
      .mockResolvedValueOnce(JSON.stringify(validConnection))
      .mockResolvedValueOnce('invalid json')
      .mockResolvedValueOnce(JSON.stringify(['valid-id', 'corrupted-id']));

    const result = await store.list();

    expect(result).toEqual([validConnection]);
    // Should update index to remove corrupted connection
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'test-prefix_index',
      JSON.stringify(['valid-id']),
    );
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      'test-prefix/corrupted-id',
    );
  });

  it('should delete a connection', async () => {
    // Mock the index containing the connection to delete
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(['test-id']),
    );

    await store.delete('test-id');

    // Should update index to remove the connection
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      'test-prefix_index',
      JSON.stringify([]),
    );
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      'test-prefix/test-id',
    );
  });

  it('should continue list operation even if delete fails', async () => {
    const validConnection: ConnectionInfo = {
      id: 'valid-id',
      metadata: {
        dapp: { name: 'Valid DApp', url: 'https://valid.com' },
        sdk: { version: '1.0.0', platform: 'ios' },
      },
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const expiredConnection: ConnectionInfo = {
      id: 'expired-id',
      metadata: {
        dapp: { name: 'Expired DApp', url: 'https://expired.com' },
        sdk: { version: '1.0.0', platform: 'ios' },
      },
      expiresAt: Date.now() - 1000,
    };

    // Mock: index, valid connection, expired connection, index during delete
    (StorageWrapper.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(['valid-id', 'expired-id']))
      .mockResolvedValueOnce(JSON.stringify(validConnection))
      .mockResolvedValueOnce(JSON.stringify(expiredConnection))
      .mockResolvedValueOnce(JSON.stringify(['valid-id', 'expired-id']));

    // Simulate delete error (setItem fails when updating index)
    (StorageWrapper.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('Delete failed'),
    );

    // Should not throw and should still return valid connections
    const result = await store.list();

    expect(result).toEqual([validConnection]);
  });
});
