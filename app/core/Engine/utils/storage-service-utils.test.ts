import {
  encodeStorageKey,
  decodeStorageKey,
  mobileStorageAdapter as adapter,
} from './storage-service-utils';
import { STORAGE_KEY_PREFIX } from '@metamask/storage-service';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../../util/device';
import Logger from '../../../util/Logger';

jest.mock('@metamask/storage-service');
jest.mock('redux-persist-filesystem-storage');
jest.mock('../../../util/device');
jest.mock('../../../util/Logger');
jest.mock('../../../util/storage/diskSpaceError', () => ({
  reportStorageWriteError: jest.fn(),
}));
import { reportStorageWriteError } from '../../../util/storage/diskSpaceError';

const mockFilesystemStorage = jest.mocked(FilesystemStorage);
const mockDevice = jest.mocked(Device);
const mockLogger = jest.mocked(Logger);

describe('storage-service-utils', () => {
  describe('encodeStorageKey', () => {
    it('encodes hyphens as %2D', () => {
      const result = encodeStorageKey('simple-key');

      expect(result).toBe('simple%2Dkey');
    });

    it('encodes slashes as %2F', () => {
      const result = encodeStorageKey('nested/path/key');

      expect(result).toBe('nested%2Fpath%2Fkey');
    });

    it('encodes percent signs as %25', () => {
      const result = encodeStorageKey('percent%key');

      expect(result).toBe('percent%25key');
    });

    it('encodes multiple hyphens', () => {
      const result = encodeStorageKey('key-with-multiple-hyphens');

      expect(result).toBe('key%2Dwith%2Dmultiple%2Dhyphens');
    });

    it('encodes multiple slashes', () => {
      const result = encodeStorageKey('a/b/c/d');

      expect(result).toBe('a%2Fb%2Fc%2Fd');
    });

    it('encodes mixed special characters', () => {
      const result = encodeStorageKey('mixed-key/with%special');

      expect(result).toBe('mixed%2Dkey%2Fwith%25special');
    });

    it('encodes snap IDs with npm scope', () => {
      const result = encodeStorageKey('npm:@metamask/bip32-keyring-snap');

      expect(result).toBe('npm:@metamask%2Fbip32%2Dkeyring%2Dsnap');
    });

    it('does not encode colons', () => {
      const result = encodeStorageKey('tokensChainsCache:0x1');

      expect(result).toBe('tokensChainsCache:0x1');
    });

    it('does not encode underscores', () => {
      const result = encodeStorageKey('safe_key_name');

      expect(result).toBe('safe_key_name');
    });

    it('does not encode alphanumeric characters', () => {
      const result = encodeStorageKey('SimpleKey123');

      expect(result).toBe('SimpleKey123');
    });

    it('returns empty string for empty input', () => {
      const result = encodeStorageKey('');

      expect(result).toBe('');
    });

    it('encodes percent first to avoid double-encoding', () => {
      const result = encodeStorageKey('key%2Dalready');

      expect(result).toBe('key%252Dalready');
    });
  });

  describe('decodeStorageKey', () => {
    it('decodes %2D back to hyphens', () => {
      const result = decodeStorageKey('simple%2Dkey');

      expect(result).toBe('simple-key');
    });

    it('decodes %2F back to slashes', () => {
      const result = decodeStorageKey('nested%2Fpath%2Fkey');

      expect(result).toBe('nested/path/key');
    });

    it('decodes %25 back to percent signs', () => {
      const result = decodeStorageKey('percent%25key');

      expect(result).toBe('percent%key');
    });

    it('decodes multiple encoded hyphens', () => {
      const result = decodeStorageKey('key%2Dwith%2Dmultiple%2Dhyphens');

      expect(result).toBe('key-with-multiple-hyphens');
    });

    it('decodes multiple encoded slashes', () => {
      const result = decodeStorageKey('a%2Fb%2Fc%2Fd');

      expect(result).toBe('a/b/c/d');
    });

    it('decodes mixed encoded characters', () => {
      const result = decodeStorageKey('mixed%2Dkey%2Fwith%25special');

      expect(result).toBe('mixed-key/with%special');
    });

    it('decodes snap IDs with npm scope', () => {
      const result = decodeStorageKey('npm:@metamask%2Fbip32%2Dkeyring%2Dsnap');

      expect(result).toBe('npm:@metamask/bip32-keyring-snap');
    });

    it('handles lowercase encoding', () => {
      const result = decodeStorageKey('key%2dvalue%2fpath');

      expect(result).toBe('key-value/path');
    });

    it('handles uppercase encoding', () => {
      const result = decodeStorageKey('key%2Dvalue%2Fpath');

      expect(result).toBe('key-value/path');
    });

    it('returns empty string for empty input', () => {
      const result = decodeStorageKey('');

      expect(result).toBe('');
    });

    it('returns unencoded strings unchanged', () => {
      const result = decodeStorageKey('SimpleKey123');

      expect(result).toBe('SimpleKey123');
    });
  });

  describe('encode/decode roundtrip', () => {
    const testCases = [
      'simple-key',
      'nested/path/key',
      'mixed-key/with/path',
      'percent%encoded',
      'npm:@metamask/bip32-keyring-snap',
      'tokensChainsCache:0x1',
      'cache:0x1:tokens',
      'safe_key',
      'CamelCaseKey',
      'complex-key/with%special-chars',
      '',
    ];

    it.each(testCases)('roundtrips "%s" correctly', (original) => {
      const encoded = encodeStorageKey(original);
      const decoded = decodeStorageKey(encoded);

      expect(decoded).toBe(original);
    });

    it('handles double encoding prevention', () => {
      const original = 'key%2Dalready-encoded';
      const encoded = encodeStorageKey(original);
      const decoded = decodeStorageKey(encoded);

      expect(decoded).toBe(original);
    });
  });
});

describe('mobileStorageAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getItem', () => {
    it('returns { result } with parsed JSON data when item exists', async () => {
      const testData = { foo: 'bar' };
      mockFilesystemStorage.getItem.mockResolvedValue(JSON.stringify(testData));

      const response = await adapter.getItem('TestController', 'testKey');

      expect(response).toStrictEqual({ result: testData });
      expect(mockFilesystemStorage.getItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:testKey`,
      );
    });

    it('returns empty object {} when item does not exist (undefined)', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue(undefined);

      const response = await adapter.getItem('TestController', 'missingKey');

      expect(response).toStrictEqual({});
    });

    it('returns empty object {} when item does not exist (null)', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue(
        null as unknown as string,
      );

      const response = await adapter.getItem('TestController', 'missingKey');

      expect(response).toStrictEqual({});
    });

    it('returns { error } and logs when JSON parsing fails', async () => {
      mockFilesystemStorage.getItem.mockResolvedValue('invalid json');

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

      const response = await adapter.getItem('TestController', 'nullValue');

      // This is different from {} - data WAS found, and it was null
      expect(response).toStrictEqual({ result: null });
    });
  });

  describe('setItem', () => {
    it('stores JSON stringified data', async () => {
      mockFilesystemStorage.setItem.mockResolvedValue(undefined);
      mockDevice.isIos.mockReturnValue(true);

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

      await expect(
        adapter.setItem('TestController', 'testKey', 'value'),
      ).rejects.toThrow('Write failed');

      expect(reportStorageWriteError).toHaveBeenCalledWith(storageError, {
        message: 'StorageService: Failed to set item: TestController:testKey',
        key: 'TestController:testKey',
        source: 'storage_service',
      });
    });
  });

  describe('removeItem', () => {
    it('removes item from storage', async () => {
      mockFilesystemStorage.removeItem.mockResolvedValue(undefined);

      await adapter.removeItem('TestController', 'testKey');

      expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
        `${STORAGE_KEY_PREFIX}TestController:testKey`,
      );
    });

    it('throws and logs error when FilesystemStorage fails', async () => {
      const storageError = new Error('Remove failed');
      mockFilesystemStorage.removeItem.mockRejectedValue(storageError);

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

      const result = await adapter.getAllKeys('TestController');

      expect(result).toStrictEqual(['key1', 'key2']);
    });

    it('returns empty array when no keys exist', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue([]);

      const result = await adapter.getAllKeys('TestController');

      expect(result).toStrictEqual([]);
    });

    it('returns empty array when getAllKeys returns null', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue(
        null as unknown as string[],
      );

      const result = await adapter.getAllKeys('TestController');

      expect(result).toStrictEqual([]);
    });

    it('logs error and throws when FilesystemStorage fails', async () => {
      mockFilesystemStorage.getAllKeys.mockRejectedValue(
        new Error('Keys error'),
      );

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

      await adapter.clear('TestController');

      expect(mockFilesystemStorage.removeItem).not.toHaveBeenCalled();
    });

    it('removes zero keys when namespace has no matching entries', async () => {
      mockFilesystemStorage.getAllKeys.mockResolvedValue([
        `${STORAGE_KEY_PREFIX}OtherController:key1`,
      ]);
      mockFilesystemStorage.removeItem.mockResolvedValue(undefined);

      await adapter.clear('TestController');

      expect(mockFilesystemStorage.removeItem).not.toHaveBeenCalled();
    });

    it('throws and logs error when FilesystemStorage fails', async () => {
      mockFilesystemStorage.getAllKeys.mockRejectedValue(
        new Error('Clear failed'),
      );

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
        await adapter.setItem('TestController', 'simple-key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
          JSON.stringify('value'),
          true,
        );
      });

      it('encodes slashes in keys as %2F', async () => {
        await adapter.setItem('TestController', 'nested/path/key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath%2Fkey`,
          JSON.stringify('value'),
          true,
        );
      });

      it('encodes percent signs in keys as %25', async () => {
        await adapter.setItem('TestController', 'percent%key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:percent%25key`,
          JSON.stringify('value'),
          true,
        );
      });

      it('encodes mixed special characters in keys', async () => {
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

        await adapter.getItem('TestController', 'simple-key');

        expect(mockFilesystemStorage.getItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
        );
      });

      it('encodes slashes in keys when retrieving', async () => {
        mockFilesystemStorage.getItem.mockResolvedValue(JSON.stringify('data'));

        await adapter.getItem('TestController', 'nested/path/key');

        expect(mockFilesystemStorage.getItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath%2Fkey`,
        );
      });

      it('encodes snap IDs with special characters', async () => {
        mockFilesystemStorage.getItem.mockResolvedValue(
          JSON.stringify({ sourceCode: '...' }),
        );

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

        await adapter.removeItem('TestController', 'simple-key');

        expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
        );
      });

      it('encodes slashes in keys when removing', async () => {
        mockFilesystemStorage.removeItem.mockResolvedValue(undefined);

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

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['simple-key']);
      });

      it('decodes %2F back to slashes in returned keys', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath%2Fkey`,
        ]);

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['nested/path/key']);
      });

      it('decodes %25 back to percent signs in returned keys', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:percent%25key`,
        ]);

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['percent%key']);
      });

      it('decodes mixed encoded characters in returned keys', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:mixed%2Dkey%2Fwith%25special`,
        ]);

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['mixed-key/with%special']);
      });

      it('decodes snap IDs with special characters', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}SnapController:npm:@metamask%2Fbip32%2Dkeyring%2Dsnap`,
        ]);

        const result = await adapter.getAllKeys('SnapController');

        expect(result).toStrictEqual(['npm:@metamask/bip32-keyring-snap']);
      });

      it('returns multiple decoded keys correctly', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}TestController:simple%2Dkey`,
          `${STORAGE_KEY_PREFIX}TestController:nested%2Fpath`,
          `${STORAGE_KEY_PREFIX}TestController:safe_key`,
        ]);

        const result = await adapter.getAllKeys('TestController');

        expect(result).toStrictEqual(['simple-key', 'nested/path', 'safe_key']);
      });
    });

    describe('namespace encoding', () => {
      beforeEach(() => {
        mockFilesystemStorage.setItem.mockResolvedValue(undefined);
        mockDevice.isIos.mockReturnValue(true);
      });

      it('encodes hyphens in namespace as %2D', async () => {
        await adapter.setItem('Test-Controller', 'key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}Test%2DController:key`,
          JSON.stringify('value'),
          true,
        );
      });

      it('encodes slashes in namespace as %2F', async () => {
        await adapter.setItem('Test/Controller', 'key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}Test%2FController:key`,
          JSON.stringify('value'),
          true,
        );
      });

      it('encodes both namespace and key with special characters', async () => {
        await adapter.setItem('My-Controller', 'nested/path-key', 'value');

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}My%2DController:nested%2Fpath%2Dkey`,
          JSON.stringify('value'),
          true,
        );
      });

      it('does not change namespaces without special characters', async () => {
        await adapter.setItem(
          'TokenListController',
          'tokensChainsCache:0x1',
          'value',
        );

        expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}TokenListController:tokensChainsCache:0x1`,
          JSON.stringify('value'),
          true,
        );
      });

      it('getAllKeys uses encoded namespace for prefix matching', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}My%2DController:key1`,
          `${STORAGE_KEY_PREFIX}My%2DController:key2`,
        ]);

        const result = await adapter.getAllKeys('My-Controller');

        expect(result).toStrictEqual(['key1', 'key2']);
      });

      it('clear uses encoded namespace for prefix matching', async () => {
        mockFilesystemStorage.getAllKeys.mockResolvedValue([
          `${STORAGE_KEY_PREFIX}My%2DController:key1`,
          `${STORAGE_KEY_PREFIX}My%2DController:key2`,
        ]);
        mockFilesystemStorage.removeItem.mockResolvedValue(undefined);

        await adapter.clear('My-Controller');

        expect(mockFilesystemStorage.removeItem).toHaveBeenCalledTimes(2);
        expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}My%2DController:key1`,
        );
        expect(mockFilesystemStorage.removeItem).toHaveBeenCalledWith(
          `${STORAGE_KEY_PREFIX}My%2DController:key2`,
        );
      });
    });
  });
});
