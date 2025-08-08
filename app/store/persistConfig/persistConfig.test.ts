// Mock Engine before other imports to prevent lodash dependency issues
jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {},
    controllerMessenger: {
      subscribe: jest.fn(),
    },
  },
  EngineContext: {},
}));

// Mock Engine constants to prevent lodash dependency issues
jest.mock('../../core/Engine/constants', () => ({
  BACKGROUND_STATE_CHANGE_EVENT_NAMES: ['TestController:stateChange'],
}));

jest.mock('../../core/EngineService/constants', () => ({
  UPDATE_BG_STATE_KEY: 'UPDATE_BG_STATE',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../util/device';
import persistConfig, { ControllerStorage } from '.';
import { version } from '../migrations';
import { Transform } from 'redux-persist';
import Logger from '../../util/Logger';

interface FieldMetadata {
  persist: boolean;
  anonymous: boolean;
}

interface ControllerMetadata {
  [key: string]: FieldMetadata;
}

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('redux-persist-filesystem-storage');
jest.mock('../../util/device');
jest.mock('../../util/Logger');
jest.mock('@metamask/base-controller', () => ({
  getPersistentState: (
    state: Record<string, unknown>,
    metadata: ControllerMetadata | undefined,
  ) => {
    if (!metadata) return {};
    return Object.entries(state).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        const fieldMetadata = metadata[key];
        if (fieldMetadata?.persist) {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );
  },
}));

// Mock redux-persist
jest.mock('redux-persist', () => ({
  createMigrate: () => () => Promise.resolve({}),
  createTransform: (
    inbound: unknown,
    outbound: unknown,
    config: { whitelist?: string[] },
  ) => ({
    in: inbound,
    out: outbound,
    whitelist: config.whitelist,
  }),
}));

// Mock migrations
const mockMigrations = {
  1: (state: unknown) => state,
};

jest.mock('../migrations', () => ({
  version: 1,
  migrations: mockMigrations,
}));

// Mock debounce
jest.mock('lodash', () => ({
  debounce: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

describe('persistConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Device.isIos
    (Device.isIos as jest.Mock).mockReturnValue(true);
  });

  describe('configuration', () => {
    it('have correct basic configuration', () => {
      expect(persistConfig.key).toBe('root');
      expect(persistConfig.version).toBe(version);
      expect(persistConfig.timeout).toBe(40000);
      expect(persistConfig.blacklist).toEqual([
        'rpcEvents',
        'accounts',
        'confirmationMetrics',
        'alert',
        'engine',
      ]);
    });

    it('have correct storage configuration', () => {
      expect(persistConfig.storage).toBeDefined();
      expect(persistConfig.stateReconciler).toBeDefined();
      expect(persistConfig.migrate).toBeDefined();
    });
  });

  describe('storage operations', () => {
    const mockKey = 'test-key';
    const mockValue = 'test-value';

    beforeEach(() => {
      // Mock FilesystemStorage methods
      (FilesystemStorage.getItem as jest.Mock).mockResolvedValue(null);
      (FilesystemStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (FilesystemStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('get item from FilesystemStorage first', async () => {
      const mockStorageValue = 'filesystem-value';
      (FilesystemStorage.getItem as jest.Mock).mockResolvedValue(
        mockStorageValue,
      );

      const result = await persistConfig.storage.getItem(mockKey);
      expect(result).toBe(mockStorageValue);
      expect(FilesystemStorage.getItem).toHaveBeenCalledWith(mockKey);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('fallback to AsyncStorage if FilesystemStorage fails', async () => {
      const mockStorageValue = 'async-storage-value';
      (FilesystemStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockStorageValue);

      const result = await persistConfig.storage.getItem(mockKey);
      expect(result).toBe(mockStorageValue);
      expect(FilesystemStorage.getItem).toHaveBeenCalledWith(mockKey);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(mockKey);
    });

    it('set item using FilesystemStorage', async () => {
      await persistConfig.storage.setItem(mockKey, mockValue);
      expect(FilesystemStorage.setItem).toHaveBeenCalledWith(
        mockKey,
        mockValue,
        true,
      );
    });

    it('remove item using FilesystemStorage', async () => {
      await persistConfig.storage.removeItem(mockKey);
      expect(FilesystemStorage.removeItem).toHaveBeenCalledWith(mockKey);
    });
  });

  describe('ControllerStorage.getKey()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns empty backgroundState for fresh install (no persisted data)', async () => {
      (FilesystemStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await ControllerStorage.getKey();

      expect(result).toEqual({ backgroundState: {} });
    });

    it('includes only controllers with meaningful state', async () => {
      (FilesystemStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'persist:KeyringController') {
          return JSON.stringify({ vault: 'encrypted_data', isUnlocked: false });
        }
        if (key === 'persist:PreferencesController') {
          return JSON.stringify({ selectedAddress: '0x123' });
        }
        // Other controllers have no data
        return null;
      });

      const result = await ControllerStorage.getKey();

      expect(result).toEqual({
        backgroundState: {
          KeyringController: { vault: 'encrypted_data', isUnlocked: false },
          PreferencesController: { selectedAddress: '0x123' },
        },
      });
    });

    it('includes controllers with empty state objects for performance', async () => {
      (FilesystemStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'persist:KeyringController') {
          return JSON.stringify({ vault: 'encrypted_data' });
        }
        if (key === 'persist:PreferencesController') {
          return JSON.stringify({}); // Empty state
        }
        return null;
      });

      const result = await ControllerStorage.getKey();

      expect(result).toEqual({
        backgroundState: {
          KeyringController: { vault: 'encrypted_data' },
          PreferencesController: {}, // Empty state included for performance
        },
      });
    });

    it('handles _persist metadata removal correctly', async () => {
      (FilesystemStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'persist:KeyringController') {
          return JSON.stringify({
            vault: 'encrypted_data',
            _persist: { version: 1, rehydrated: true },
          });
        }
        return null;
      });

      const result = await ControllerStorage.getKey();

      expect(result).toEqual({
        backgroundState: {
          KeyringController: { vault: 'encrypted_data' },
          // _persist metadata should be removed
        },
      });
    });

    it('handles invalid JSON data gracefully', async () => {
      (FilesystemStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'persist:KeyringController') {
          return 'invalid json';
        }
        return null;
      });

      const result = await ControllerStorage.getKey();

      expect(result).toEqual({ backgroundState: {} });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'Failed to get controller state for KeyringController',
        }),
      );
    });

    it('handles non-object parsed data gracefully', async () => {
      (FilesystemStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'persist:KeyringController') {
          return JSON.stringify(null); // Valid JSON but not an object
        }
        if (key === 'persist:PreferencesController') {
          return JSON.stringify('string'); // Valid JSON but string
        }
        if (key === 'persist:NetworkController') {
          return JSON.stringify([1, 2, 3]); // Valid JSON but array
        }
        return null;
      });

      const result = await ControllerStorage.getKey();

      expect(result).toEqual({ backgroundState: {} });
      expect(Logger.error).toHaveBeenCalledWith(
        new Error(
          'Invalid persisted data for KeyringController: not an object',
        ),
      );
      expect(Logger.error).toHaveBeenCalledWith(
        new Error(
          'Invalid persisted data for PreferencesController: not an object',
        ),
      );
      expect(Logger.error).toHaveBeenCalledWith(
        new Error(
          'Invalid persisted data for NetworkController: not an object',
        ),
      );
    });

    it('handles FilesystemStorage errors gracefully', async () => {
      (FilesystemStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'persist:KeyringController') {
          throw new Error('Storage access failed');
        }
        return null;
      });

      const result = await ControllerStorage.getKey();

      expect(result).toEqual({ backgroundState: {} });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'Failed to get controller state for KeyringController',
        }),
      );
    });

    it('handles overall method failure gracefully', async () => {
      const originalPromiseAll = Promise.all;
      jest
        .spyOn(Promise, 'all')
        .mockRejectedValueOnce(new Error('Promise.all failed'));

      const result = await ControllerStorage.getKey();

      expect(result).toEqual({ backgroundState: {} });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'Failed to gather controller states',
        }),
      );

      Promise.all = originalPromiseAll;
    });
  });

  describe('transforms', () => {
    it('have correct number of transforms', () => {
      expect(persistConfig.transforms).toHaveLength(2);
    });

    it('have user transform configured', () => {
      const userTransform = persistConfig.transforms[0] as Transform<
        unknown,
        unknown
      > & { whitelist?: string[] };
      expect(userTransform.whitelist).toEqual(['user']);
    });

    it('has onboarding transform configured', () => {
      const onboardingTransform = persistConfig.transforms[1] as Transform<
        unknown,
        unknown
      > & { whitelist?: string[] };
      expect(onboardingTransform.whitelist).toEqual(['onboarding']);
    });
  });
});
