import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getStorageServiceMessenger } from '../messengers/storage-service-messenger';
import { ControllerInitRequest } from '../types';
import { storageServiceInit } from './storage-service-init';
import {
  StorageService,
  StorageServiceMessenger,
  STORAGE_KEY_PREFIX,
} from '@metamask-previews/storage-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../../util/device';
import Logger from '../../../util/Logger';

jest.mock('@metamask-previews/storage-service');
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
    it('returns parsed JSON data when item exists', async () => {
      const testData = { foo: 'bar' };
      mockFilesystemStorage.getItem.mockResolvedValue(JSON.stringify(testData));

      const adapter = getStorageAdapter();
      const result = await adapter.getItem('TestController', 'testKey');

      expect(result).toStrictEqual(testData);
      expect(mockFilesystemStorage.getItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:testKey`,
      );
    });

    it('returns null when item does not exist', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue(undefined);

      const adapter = getStorageAdapter();
      const result = await adapter.getItem('TestController', 'missingKey');

      expect(result).toBeNull();
    });

    it('logs error and throws when JSON parsing fails', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue('invalid json');

      const adapter = getStorageAdapter();

      await expect(
        adapter.getItem('TestController', 'badKey'),
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'StorageService: Failed to get item: TestController:badKey',
        }),
      );
    });

    it('logs error and throws when FilesystemStorage throws', async () => {
      mockFilesystemStorage.getItem.mockRejectedValue(
        new Error('Storage error'),
      );

      const adapter = getStorageAdapter();

      await expect(
        adapter.getItem('TestController', 'errorKey'),
      ).rejects.toThrow('Storage error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message:
            'StorageService: Failed to get item: TestController:errorKey',
        }),
      );
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
      expect(mockLogger.log).toHaveBeenCalledWith(
        'StorageService: Cleared 2 keys for TestController',
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

    it('removes zero keys and logs count when namespace has no matching entries', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue([
        `${STORAGE_KEY_PREFIX}OtherController:key1`,
      ]);
      mockFilesystemStorage.removeItem.mockResolvedValue(undefined);

      const adapter = getStorageAdapter();
      await adapter.clear('TestController');

      expect(mockFilesystemStorage.removeItem).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'StorageService: Cleared 0 keys for TestController',
      );
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
});
