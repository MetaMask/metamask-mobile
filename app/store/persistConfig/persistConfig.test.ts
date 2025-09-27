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
import persistConfig, { ControllerStorage, setupEnginePersistence } from '.';
import { version } from '../migrations';
import { Transform } from 'redux-persist';
import Logger from '../../util/Logger';
import Engine from '../../core/Engine';
// Note: debounce import not needed as it's mocked at the top
import ReduxService from '../../core/redux';
import { UPDATE_BG_STATE_KEY } from '../../core/EngineService/constants';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../../core/Engine/constants';
import { getPersistentState } from '../getPersistentState/getPersistentState';

// Note: debounce is mocked to return the original function for testing simplicity

interface FieldMetadata {
  persist: boolean;
  anonymous: boolean;
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

  describe('setupEnginePersistence', () => {
    // Mock references for easy access in tests
    const mockControllerMessenger = Engine.controllerMessenger as jest.Mocked<
      typeof Engine.controllerMessenger
    >;
    const mockDispatch = ReduxService.store.dispatch as jest.MockedFunction<
      typeof ReduxService.store.dispatch
    >;
    // Note: debounce mock is configured at the top of the file
    const mockGetPersistentState = getPersistentState as jest.MockedFunction<
      typeof getPersistentState
    >;

    beforeEach(() => {
      // Reset specific mocks before each test (but preserve implementations)
      mockControllerMessenger.subscribe.mockClear();
      mockDispatch.mockClear();
      mockGetPersistentState.mockClear();
      (Logger.log as jest.MockedFunction<typeof Logger.log>).mockClear();
      (Logger.error as jest.MockedFunction<typeof Logger.error>).mockClear();
      // Reset Engine context
      (Engine as { context: unknown }).context = {
        KeyringController: {
          metadata: {
            field1: { persist: true, anonymous: false },
            field2: { persist: false, anonymous: true },
          },
        },
      };

      // Reset mock implementations
      mockGetPersistentState.mockReturnValue({ filtered: 'state' });
    });

    describe('successful setup', () => {
      it('sets up subscriptions for all controller state change events', () => {
        // Arrange
        // Engine.controllerMessenger is already mocked with subscribe function

        // Act
        setupEnginePersistence();

        // Then
        expect(mockControllerMessenger.subscribe).toHaveBeenCalledTimes(
          BACKGROUND_STATE_CHANGE_EVENT_NAMES.length,
        );
        expect(mockControllerMessenger.subscribe).toHaveBeenCalledWith(
          'KeyringController:stateChange',
          expect.any(Function),
        );
        expect(Logger.log).toHaveBeenCalledWith(
          'Individual controller persistence and Redux update subscriptions set up successfully',
        );
      });

      it('uses debouncing for subscription callbacks', () => {
        // Note: We can't easily test the debounce function call directly
        // due to Jest module hoisting issues, but we can verify the function
        // works correctly by testing the overall behavior
        // Act
        setupEnginePersistence();

        // Then - verify that subscribe was called for each event
        expect(mockControllerMessenger.subscribe).toHaveBeenCalledTimes(
          BACKGROUND_STATE_CHANGE_EVENT_NAMES.length,
        );
        expect(mockControllerMessenger.subscribe).toHaveBeenCalledWith(
          'KeyringController:stateChange',
          expect.any(Function), // The debounced function
        );
      });

      it('logs setup success message', () => {
        // Act
        setupEnginePersistence();

        // Then
        expect(Logger.log).toHaveBeenCalledWith(
          'Individual controller persistence and Redux update subscriptions set up successfully',
        );
      });
    });

    describe('controller state persistence flow', () => {
      let subscriptionCallback: (controllerState: unknown) => Promise<void>;

      beforeEach(async () => {
        // Setup and capture the subscription callback
        setupEnginePersistence();
        expect(mockControllerMessenger.subscribe).toHaveBeenCalledWith(
          'KeyringController:stateChange',
          expect.any(Function),
        );

        // Extract the callback function (it's debounced, but we mocked debounce to return the original function)
        subscriptionCallback = mockControllerMessenger.subscribe.mock
          .calls[0][1] as (controllerState: unknown) => Promise<void>;
      });

      it('filters controller state using getPersistentState', async () => {
        // Arrange
        const controllerState = { field1: 'value1', field2: 'value2' };

        // Act
        await subscriptionCallback(controllerState);

        // Then
        expect(mockGetPersistentState).toHaveBeenCalledWith(
          controllerState,
          (
            (Engine as { context: unknown }).context as {
              KeyringController?: { metadata: unknown };
            }
          ).KeyringController?.metadata,
        );
      });

      it('persists filtered state to filesystem storage', async () => {
        // Arrange
        const controllerState = { field1: 'value1', field2: 'value2' };
        const mockSetItem = jest
          .spyOn(ControllerStorage, 'setItem')
          .mockResolvedValue();

        // Act
        await subscriptionCallback(controllerState);

        // Then
        expect(mockSetItem).toHaveBeenCalledWith(
          'persist:KeyringController',
          JSON.stringify({ filtered: 'state' }),
        );
      });

      it('dispatches Redux action after successful persistence', async () => {
        // Arrange
        const controllerState = { field1: 'value1' };
        jest.spyOn(ControllerStorage, 'setItem').mockResolvedValue();

        // Act
        await subscriptionCallback(controllerState);

        // Then
        expect(mockDispatch).toHaveBeenCalledWith({
          type: UPDATE_BG_STATE_KEY,
          payload: { key: 'KeyringController' },
        });
      });

      it('logs successful persistence', async () => {
        // Arrange
        const controllerState = { field1: 'value1' };
        jest.spyOn(ControllerStorage, 'setItem').mockResolvedValue();

        // Act
        await subscriptionCallback(controllerState);

        // Then
        expect(Logger.log).toHaveBeenCalledWith(
          'KeyringController state persisted successfully',
        );
      });

      it('handles persistence errors gracefully without throwing', async () => {
        // Arrange
        const controllerState = { field1: 'value1' };
        const persistError = new Error('Storage failed');
        jest
          .spyOn(ControllerStorage, 'setItem')
          .mockRejectedValue(persistError);

        // Act & Assert - should not throw
        await expect(
          subscriptionCallback(controllerState),
        ).resolves.toBeUndefined();

        // Then
        expect(Logger.error).toHaveBeenCalledWith(
          persistError,
          'Failed to persist KeyringController state',
        );
        // Should not dispatch Redux action on error
        expect(mockDispatch).not.toHaveBeenCalled();
      });

      it('handles getPersistentState errors gracefully', async () => {
        // Arrange
        const controllerState = { field1: 'value1' };
        const filterError = new Error('Filter failed');
        mockGetPersistentState.mockImplementation(() => {
          throw filterError;
        });

        // Act & Assert - should not throw
        await expect(
          subscriptionCallback(controllerState),
        ).resolves.toBeUndefined();

        // Then
        expect(Logger.error).toHaveBeenCalledWith(
          filterError,
          'Failed to persist KeyringController state',
        );
      });

      it('works with controllers that have no metadata', async () => {
        // Arrange
        (
          (Engine as { context: unknown }).context as {
            KeyringController?: unknown;
          }
        ).KeyringController = undefined; // Simulate missing metadata
        const controllerState = { field1: 'value1' };
        jest.spyOn(ControllerStorage, 'setItem').mockResolvedValue();

        // Act
        await subscriptionCallback(controllerState);

        // Then
        expect(mockGetPersistentState).toHaveBeenCalledWith(
          controllerState,
          undefined,
        );
        expect(ControllerStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('handles missing controllerMessenger gracefully', () => {
        // Arrange
        (Engine as { controllerMessenger: unknown }).controllerMessenger = null;

        // Act & Assert - should not throw
        expect(() => setupEnginePersistence()).not.toThrow();

        // Then
        expect(Logger.log).not.toHaveBeenCalledWith(
          'Individual controller persistence and Redux update subscriptions set up successfully',
        );
      });

      it('handles undefined controllerMessenger gracefully', () => {
        // Arrange
        (
          Engine as unknown as { controllerMessenger: undefined }
        ).controllerMessenger = undefined;

        // Act & Assert - should not throw
        expect(() => setupEnginePersistence()).not.toThrow();

        // Then
        expect(Logger.log).not.toHaveBeenCalledWith(
          'Individual controller persistence and Redux update subscriptions set up successfully',
        );
      });

      // Note: Testing subscription errors during forEach is complex due to
      // the way forEach handles exceptions. In practice, subscription errors
      // would be caught by the outer try-catch, but this is hard to test reliably.

      it('handles overall setup errors gracefully', () => {
        // Arrange
        const setupError = new Error('Setup failed');
        // Mock Engine to throw during property access
        Object.defineProperty(Engine, 'controllerMessenger', {
          get: () => {
            throw setupError;
          },
          configurable: true,
        });

        // Act & Assert - should not throw
        expect(() => setupEnginePersistence()).not.toThrow();

        // Then
        expect(Logger.error).toHaveBeenCalledWith(
          setupError,
          'Failed to set up Engine persistence subscription',
        );
      });
    });

    // Note: Controller name extraction is tested implicitly through the
    // "controller state persistence flow" tests above which verify the
    // complete persistence workflow including controller name handling.
  });
});
