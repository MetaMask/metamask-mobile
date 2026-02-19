import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getStorageServiceMessenger } from '../messengers/storage-service-messenger';
import { ControllerInitRequest } from '../types';
import { storageServiceInit } from './storage-service-init';
import {
  StorageService,
  StorageServiceMessenger,
  STORAGE_KEY_PREFIX,
} from '@metamask/storage-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../../util/device';
import Logger from '../../../util/Logger';

jest.mock('@metamask/storage-service');
jest.mock('redux-persist-filesystem-storage');
jest.mock('../../../util/device');
jest.mock('../../../util/Logger');

const mockFilesystemStorage = jest.mocked(FilesystemStorage);
const mockDevice = jest.mocked(Device);
const mockLogger = jest.mocked(Logger);

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<StorageServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getStorageServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('storageServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the service', () => {
    const { controller } = storageServiceInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(StorageService);
  });

  it('passes the proper arguments to the service', () => {
    storageServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(StorageService);

    expect(serviceMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      storage: expect.objectContaining({
        getItem: expect.any(Function),
        setItem: expect.any(Function),
        removeItem: expect.any(Function),
        getAllKeys: expect.any(Function),
        clear: expect.any(Function),
      }),
    });
  });

  it('provides FilesystemStorage adapter with required methods', () => {
    storageServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(StorageService);
    const callArguments = serviceMock.mock.calls[0][0];

    expect(callArguments.storage).toBeDefined();
    expect(callArguments.storage?.getItem).toBeInstanceOf(Function);
    expect(callArguments.storage?.setItem).toBeInstanceOf(Function);
    expect(callArguments.storage?.removeItem).toBeInstanceOf(Function);
    expect(callArguments.storage?.getAllKeys).toBeInstanceOf(Function);
    expect(callArguments.storage?.clear).toBeInstanceOf(Function);
  });
});

describe('mobileStorageAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper to get the storage adapter from the init call
   */
  function getStorageAdapter() {
    storageServiceInit(getInitRequestMock());
    const serviceMock = jest.mocked(StorageService);
    const storage = serviceMock.mock.calls[0][0].storage;
    if (!storage) {
      throw new Error('Storage adapter not provided');
    }
    return storage;
  }

  describe('getItem', () => {
    it('returns { result } with parsed JSON data when item exists', async () => {
      const testData = { foo: 'bar' };
      mockFilesystemStorage.getItem.mockResolvedValue(JSON.stringify(testData));

      const adapter = getStorageAdapter();
      const response = await adapter.getItem('TestController', 'testKey');

      expect(response).toStrictEqual({ result: testData });
      expect(mockFilesystemStorage.getItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:testKey`,
      );
    });

    it('returns empty object {} when item does not exist (undefined)', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue(undefined);

      const adapter = getStorageAdapter();
      const response = await adapter.getItem('TestController', 'missingKey');

      expect(response).toStrictEqual({});
    });

    it('returns empty object {} when item does not exist (null)', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue(
        null as unknown as string,
      );

      const adapter = getStorageAdapter();
      const response = await adapter.getItem('TestController', 'missingKey');

      expect(response).toStrictEqual({});
    });

    it('returns { error } and logs when JSON parsing fails', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue('invalid json');

      const adapter = getStorageAdapter();
      const response = await adapter.getItem('TestController', 'badKey');

      expect(response).toStrictEqual({ error: expect.any(Error) });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'StorageService: Failed to get item: TestController:badKey',
        }),
      );
    });

    it('returns { error } and logs when FilesystemStorage throws', async () => {
      const storageError = new Error('Storage error');
      mockFilesystemStorage.getItem.mockRejectedValue(storageError);

      const adapter = getStorageAdapter();
      const response = await adapter.getItem('TestController', 'errorKey');

      expect(response).toStrictEqual({ error: storageError });
      expect(mockLogger.error).toHaveBeenCalledWith(
        storageError,
        expect.objectContaining({
          message:
            'StorageService: Failed to get item: TestController:errorKey',
        }),
      );
    });

    it('returns { result: null } when null was explicitly stored', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue(JSON.stringify(null));

      const adapter = getStorageAdapter();
      const response = await adapter.getItem('TestController', 'nullValue');

      // This is different from {} - data WAS found, and it was null
      expect(response).toStrictEqual({ result: null });
    });
  });

  describe('setItem', () => {
    it('stores JSON stringified data', async () => {
      mockFilesystemStorage.setItem.mockResolvedValue(undefined);
      mockDevice.isIos.mockReturnValue(true);

      const adapter = getStorageAdapter();
      await adapter.setItem('TestController', 'testKey', { foo: 'bar' });

      expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:testKey`,
        JSON.stringify({ foo: 'bar' }),
        true,
      );
    });

    it('passes false for isIos on Android devices', async () => {
      mockFilesystemStorage.setItem.mockResolvedValue(undefined);
      mockDevice.isIos.mockReturnValue(false);

      const adapter = getStorageAdapter();
      await adapter.setItem('TestController', 'testKey', 'value');

      expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:testKey`,
        JSON.stringify('value'),
        false,
      );
    });

    it('throws and logs error when FilesystemStorage fails', async () => {
      const storageError = new Error('Write failed');
      mockFilesystemStorage.setItem.mockRejectedValue(storageError);
      mockDevice.isIos.mockReturnValue(true);

      const adapter = getStorageAdapter();

      await expect(
        adapter.setItem('TestController', 'testKey', 'value'),
      ).rejects.toThrow('Write failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        storageError,
        expect.objectContaining({
          message: 'StorageService: Failed to set item: TestController:testKey',
        }),
      );
    });
  });

  describe('removeItem', () => {
    it('removes item from storage', async () => {
      mockFilesystemStorage.removeItem.mockResolvedValue(undefined);

      const adapter = getStorageAdapter();
      await adapter.removeItem('TestController', 'testKey');

      expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:testKey`,
      );
    });

    it('throws and logs error when FilesystemStorage fails', async () => {
      const storageError = new Error('Remove failed');
      mockFilesystemStorage.removeItem.mockRejectedValue(storageError);

      const adapter = getStorageAdapter();

      await expect(
        adapter.removeItem('TestController', 'testKey'),
      ).rejects.toThrow('Remove failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        storageError,
        expect.objectContaining({
          message:
            'StorageService: Failed to remove item: TestController:testKey',
        }),
      );
    });
  });

  describe('getAllKeys', () => {
    it('returns keys matching namespace prefix without prefix', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue([
        `${STORAGE_KEY_PREFIX}TestController:key1`,
        `${STORAGE_KEY_PREFIX}TestController:key2`,
        `${STORAGE_KEY_PREFIX}OtherController:key3`,
      ]);

      const adapter = getStorageAdapter();
      const result = await adapter.getAllKeys('TestController');

      expect(result).toStrictEqual(['key1', 'key2']);
    });

    it('returns empty array when no keys exist', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue([]);

      const adapter = getStorageAdapter();
      const result = await adapter.getAllKeys('TestController');

      expect(result).toStrictEqual([]);
    });

    it('returns empty array when getAllKeys returns null', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue(
        null as unknown as string[],
      );

      const adapter = getStorageAdapter();
      const result = await adapter.getAllKeys('TestController');

      expect(result).toStrictEqual([]);
    });

    it('logs error and throws when FilesystemStorage fails', async () => {
      mockFilesystemStorage.getAllKeys.mockRejectedValue(
        new Error('Keys error'),
      );

      const adapter = getStorageAdapter();

      await expect(adapter.getAllKeys('TestController')).rejects.toThrow(
        'Keys error',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'StorageService: Failed to get keys for TestController',
        }),
      );
    });
  });

  describe('clear', () => {
    it('removes all keys matching namespace prefix', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue([
        `${STORAGE_KEY_PREFIX}TestController:key1`,
        `${STORAGE_KEY_PREFIX}TestController:key2`,
        `${STORAGE_KEY_PREFIX}OtherController:key3`,
      ]);
      mockFilesystemStorage.removeItem.mockResolvedValue(undefined);

      const adapter = getStorageAdapter();
      await adapter.clear('TestController');

      expect(mockFilesystemStorage.removeItem).toHaveBeenCalledTimes(2);
      expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:key1`,
      );
      expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:key2`,
      );
    });

    it('returns early when getAllKeys returns null', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue(
        null as unknown as string[],
      );

      const adapter = getStorageAdapter();
      await adapter.clear('TestController');

      expect(mockFilesystemStorage.removeItem).not.toHaveBeenCalled();
    });

    it('removes zero keys when namespace has no matching entries', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue([
        `${STORAGE_KEY_PREFIX}OtherController:key1`,
      ]);
      mockFilesystemStorage.removeItem.mockResolvedValue(undefined);

      const adapter = getStorageAdapter();
      await adapter.clear('TestController');

      expect(mockFilesystemStorage.removeItem).not.toHaveBeenCalled();
    });

    it('throws and logs error when FilesystemStorage fails', async () => {
      mockFilesystemStorage.getAllKeys.mockRejectedValue(
        new Error('Clear failed'),
      );

      const adapter = getStorageAdapter();

      await expect(adapter.clear('TestController')).rejects.toThrow(
        'Clear failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'StorageService: Failed to clear namespace TestController',
        }),
      );
    });
  });

  describe('key encoding', () => {
    describe('setItem', () => {
      beforeEach(() => {
        mockFilesystemStorage.setItem.mockResolvedValue(undefined);
        mockDevice.isIos.mockReturnValue(true);
      });

      it('encodes hyphens in keys as %2D', async () => {
        const adapter = getStorageAdapter();

        await adapter.setItem('TestController', 'simple-key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
          JSON.stringify('value'),
          true,
        );
      });

      it('encodes slashes in keys as %2F', async () => {
        const adapter = getStorageAdapter();

        await adapter.setItem('TestController', 'nested/path/key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath%2Fkey`,
          JSON.stringify('value'),
          true,
        );
      });

      it('encodes percent signs in keys as %25', async () => {
        const adapter = getStorageAdapter();

        await adapter.setItem('TestController', 'percent%key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:percent%25key`,
          JSON.stringify('value'),
          true,
        );
      });

      it('encodes mixed special characters in keys', async () => {
        const adapter = getStorageAdapter();

        await adapter.setItem(
          'TestController',
          'mixed-key/with%special',
          'value',
        );

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:mixed%2Dkey%2Fwith%25special`,
          JSON.stringify('value'),
          true,
        );
      });

      it('does not encode colons in keys', async () => {
        const adapter = getStorageAdapter();

        await adapter.setItem(
          'TestController',
          'tokensChainsCache:0x1',
          'value',
        );

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:tokensChainsCache:0x1`,
          JSON.stringify('value'),
          true,
        );
      });
    });

    describe('getItem', () => {
      it('encodes hyphens in keys when retrieving', async () => {
        mockFilesystemStorage.getItem.mockResolvedValue(JSON.stringify('data'));
        const adapter = getStorageAdapter();

        await adapter.getItem('TestController', 'simple-key');

        expect(mockFilesystemStorage.getItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
        );
      });

      it('encodes slashes in keys when retrieving', async () => {
        mockFilesystemStorage.getItem.mockResolvedValue(JSON.stringify('data'));
        const adapter = getStorageAdapter();

        await adapter.getItem('TestController', 'nested/path/key');

        expect(mockFilesystemStorage.getItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath%2Fkey`,
        );
      });

      it('encodes snap IDs with special characters', async () => {
        mockFilesystemStorage.getItem.mockResolvedValue(
          JSON.stringify({ sourceCode: '...' }),
        );
        const adapter = getStorageAdapter();

        await adapter.getItem(
          'SnapController',
          'npm:@metamask/bip32-keyring-snap',
        );

        expect(mockFilesystemStorage.getItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}SnapController:npm:@metamask%2Fbip32%2Dkeyring%2Dsnap`,
        );
      });
    });

    describe('removeItem', () => {
      it('encodes hyphens in keys when removing', async () => {
        mockFilesystemStorage.removeItem.mockResolvedValue(undefined);
        const adapter = getStorageAdapter();

        await adapter.removeItem('TestController', 'simple-key');

        expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
        );
      });

      it('encodes slashes in keys when removing', async () => {
        mockFilesystemStorage.removeItem.mockResolvedValue(undefined);
        const adapter = getStorageAdapter();

        await adapter.removeItem('TestController', 'nested/path/key');

        expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath%2Fkey`,
        );
      });
    });

    describe('getAllKeys', () => {
      it('decodes %2D back to hyphens in returned keys', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
        ]);
        const adapter = getStorageAdapter();

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['simple-key']);
      });

      it('decodes %2F back to slashes in returned keys', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath%2Fkey`,
        ]);
        const adapter = getStorageAdapter();

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['nested/path/key']);
      });

      it('decodes %25 back to percent signs in returned keys', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:percent%25key`,
        ]);
        const adapter = getStorageAdapter();

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['percent%key']);
      });

      it('decodes mixed encoded characters in returned keys', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:mixed%2Dkey%2Fwith%25special`,
        ]);
        const adapter = getStorageAdapter();

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['mixed-key/with%special']);
      });

      it('decodes snap IDs with special characters', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}SnapController:npm:@metamask%2Fbip32%2Dkeyring%2Dsnap`,
        ]);
        const adapter = getStorageAdapter();

        const result = await adapter.getAllKeys('SnapController');

        expect(result).toStrictEqual(['npm:@metamask/bip32-keyring-snap']);
      });

      it('returns multiple decoded keys correctly', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath`,
          `${STORAGE_KEY_PREFIX}TestController:safe_key`,
        ]);
        const adapter = getStorageAdapter();

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['simple-key', 'nested/path', 'safe_key']);
      });
    });
  });
});
