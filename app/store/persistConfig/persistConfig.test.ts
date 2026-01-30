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
  BACKGROUND_STATE_CHANGE_EVENT_NAMES: [
    'KeyringController:stateChange',
    'PreferencesController:stateChange',
    'NetworkController:stateChange',
  ],
}));

jest.mock('../../core/EngineService/constants', () => ({
  UPDATE_BG_STATE_KEY: 'UPDATE_BG_STATE',
}));

jest.mock('../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
    },
  },
}));

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: jest.fn((fn) => fn), // Return the original function for simplicity
}));

jest.mock('../getPersistentState/getPersistentState', () => ({
  getPersistentState: jest.fn((_state, _metadata) => ({ filtered: 'state' })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../util/device';
import persistConfig, { ControllerStorage, createPersistController } from '.';
import { version } from '../migrations';
import { Transform } from 'redux-persist';
import Logger from '../../util/Logger';

// Note: debounce is mocked to return the original function for testing simplicity

interface FieldMetadata {
  persist: boolean;
  includeInDebugSnapshot: boolean;
  includeInStateLogs: boolean;
  usedInUi: boolean;
}

interface ControllerMetadata {
  [key: string]: FieldMetadata;
}

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('redux-persist-filesystem-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
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

// (debounce already mocked above)

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
        'qrKeyringScanner',
        'securityAlerts',
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

  describe('ControllerStorage.getAllPersistedState()', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns empty backgroundState for fresh install (no persisted data)', async () => {
      (FilesystemStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await ControllerStorage.getAllPersistedState();

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

      const result = await ControllerStorage.getAllPersistedState();

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

      const result = await ControllerStorage.getAllPersistedState();

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

      const result = await ControllerStorage.getAllPersistedState();

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

      const result = await ControllerStorage.getAllPersistedState();

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

      const result = await ControllerStorage.getAllPersistedState();

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

      const result = await ControllerStorage.getAllPersistedState();

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

      const result = await ControllerStorage.getAllPersistedState();

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

  describe('createPersistController', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (Device.isIos as jest.Mock).mockReturnValue(true);
    });

    it('should return a debounced function', () => {
      // Act
      const persistController = createPersistController(100);

      // Assert
      expect(persistController).toBeInstanceOf(Function);
    });

    it('should use default debounce time of 200ms when not specified', () => {
      // Act
      const persistController = createPersistController();

      // Assert
      expect(persistController).toBeInstanceOf(Function);
      // Note: We can't easily test the actual debounce time due to mocking
      // but we can verify the function is created correctly
    });

    it('should persist filtered state to filesystem storage', async () => {
      // Arrange
      const mockSetItem = jest
        .spyOn(ControllerStorage, 'setItem')
        .mockResolvedValue();
      const persistController = createPersistController();
      const filteredState = { vault: 'encrypted_data' };
      const controllerName = 'KeyringController';

      // Act
      await persistController(filteredState, controllerName);

      // Assert
      expect(mockSetItem).toHaveBeenCalledWith(
        'persist:KeyringController',
        JSON.stringify(filteredState),
      );
    });

    it('should log successful persistence', async () => {
      // Arrange
      jest.spyOn(ControllerStorage, 'setItem').mockResolvedValue();
      const persistController = createPersistController();
      const filteredState = { selectedAddress: '0x123' };
      const controllerName = 'PreferencesController';

      // Act
      await persistController(filteredState, controllerName);

      // Assert
      expect(Logger.log).toHaveBeenCalledWith(
        'PreferencesController state persisted successfully',
      );
    });

    it('should handle persistence errors gracefully', async () => {
      // Arrange
      const persistError = new Error('Storage failed');
      jest.spyOn(ControllerStorage, 'setItem').mockRejectedValue(persistError);
      const persistController = createPersistController();
      const filteredState = { data: 'test' };
      const controllerName = 'NetworkController';

      // Act & Assert - should not throw
      await expect(
        persistController(filteredState, controllerName),
      ).resolves.toBeUndefined();

      // Assert error logging
      expect(Logger.error).toHaveBeenCalledWith(persistError, {
        message: 'Failed to persist NetworkController state',
      });
    });

    it('should work with different controller names and states', async () => {
      // Arrange
      const mockSetItem = jest
        .spyOn(ControllerStorage, 'setItem')
        .mockResolvedValue();
      const persistController = createPersistController(50);

      const testCases = [
        { state: { tokens: [] }, controller: 'TokensController' },
        { state: { networks: {} }, controller: 'NetworkController' },
        { state: { accounts: [] }, controller: 'AccountsController' },
      ];

      // Act & Assert
      for (const testCase of testCases) {
        await persistController(testCase.state, testCase.controller);

        expect(mockSetItem).toHaveBeenCalledWith(
          `persist:${testCase.controller}`,
          JSON.stringify(testCase.state),
        );
        expect(Logger.log).toHaveBeenCalledWith(
          `${testCase.controller} state persisted successfully`,
        );
      }
    });

    it('should handle complex state objects correctly', async () => {
      // Arrange
      const mockSetItem = jest
        .spyOn(ControllerStorage, 'setItem')
        .mockResolvedValue();
      const persistController = createPersistController();

      const complexState = {
        nested: {
          data: {
            array: [1, 2, 3],
            boolean: true,
            null: null,
            string: 'test',
          },
        },
        emptyObject: {},
        emptyArray: [],
      };
      const controllerName = 'ComplexController';

      // Act
      await persistController(complexState, controllerName);

      // Assert
      expect(mockSetItem).toHaveBeenCalledWith(
        'persist:ComplexController',
        JSON.stringify(complexState),
      );
    });
  });
});
