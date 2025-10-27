import { waitFor } from '@testing-library/react-native';
import { EngineService } from './EngineService';
import ReduxService, { type ReduxStore } from '../redux';
import Engine from '../Engine';
import { type KeyringControllerState } from '@metamask/keyring-controller';
import NavigationService from '../NavigationService';
import Logger from '../../util/Logger';
import Routes from '../../constants/navigation/Routes';
import { INIT_BG_STATE_KEY, UPDATE_BG_STATE_KEY } from './constants';
import {
  ControllerStorage,
  createPersistController,
} from '../../store/persistConfig';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../Engine/constants';
import { getPersistentState } from '../../store/getPersistentState/getPersistentState';

// Mock NavigationService
jest.mock('../NavigationService', () => ({
  navigation: {
    reset: jest.fn(),
  },
}));

// Mock Logger
jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

jest.mock('../BackupVault', () => ({
  getVaultFromBackup: () => ({ success: true, vault: 'fake_vault' }),
}));

jest.mock('../../util/test/network-store.js', () => jest.fn());

// Mock Engine constants and Redux
jest.mock('../Engine/constants', () => ({
  BACKGROUND_STATE_CHANGE_EVENT_NAMES: [
    'KeyringController:stateChange',
    'PreferencesController:stateChange',
    'NetworkController:stateChange',
  ],
}));

jest.mock('../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
    },
  },
}));

jest.mock('../../store/getPersistentState/getPersistentState', () => ({
  getPersistentState: jest.fn((_state, _metadata) => ({ filtered: 'state' })),
}));

// Mock ControllerStorage and createPersistController
jest.mock('../../store/persistConfig', () => ({
  ControllerStorage: {
    getAllPersistedState: jest.fn(() =>
      Promise.resolve({ backgroundState: {} }),
    ),
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  createPersistController: jest.fn(() => jest.fn()),
}));

// Unmock global Engine
jest.unmock('../Engine');

interface MockControllerMessenger {
  subscribe: jest.MockedFunction<(...args: unknown[]) => void>;
  subscribeOnceIf: jest.MockedFunction<(...args: unknown[]) => void>;
}

interface MockController {
  subscribe: jest.MockedFunction<(...args: unknown[]) => void>;
  state?: unknown;
  metadata?: Record<string, unknown>;
}

interface MockEngineContext {
  [controllerName: string]: MockController;
  KeyringController: MockController & {
    state: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

interface MockEngineInstance {
  controllerMessenger: MockControllerMessenger;
  context: MockEngineContext;
}

jest.mock('../Engine', () => {
  let mockInstance: MockEngineInstance | null;

  const mockEngine = {
    init: (_: unknown, keyringState: KeyringControllerState) => {
      mockInstance = {
        controllerMessenger: {
          subscribe: jest.fn(),
          subscribeOnceIf: jest.fn(),
        },
        context: {
          AddressBookController: { subscribe: jest.fn() },
          KeyringController: {
            subscribe: jest.fn(),
            state: { ...keyringState },
          },
          AssetsContractController: { subscribe: jest.fn() },
          NftController: { subscribe: jest.fn() },
          TokensController: { subscribe: jest.fn() },
          TokenDetectionController: { subscribe: jest.fn() },
          NftDetectionController: { subscribe: jest.fn() },
          AccountTrackerController: { subscribe: jest.fn() },
          NetworkController: { subscribe: jest.fn() },
          PhishingController: { subscribe: jest.fn() },
          PreferencesController: { subscribe: jest.fn() },
          RemoteFeatureFlagController: { subscribe: jest.fn() },
          TokenBalancesController: { subscribe: jest.fn() },
          TokenRatesController: { subscribe: jest.fn() },
          TransactionController: { subscribe: jest.fn() },
          SmartTransactionsController: { subscribe: jest.fn() },
          SwapsController: { subscribe: jest.fn() },
          TokenListController: { subscribe: jest.fn() },
          CurrencyRateController: { subscribe: jest.fn() },
          GasFeeController: { subscribe: jest.fn() },
          ApprovalController: { subscribe: jest.fn() },
          PermissionController: { subscribe: jest.fn() },
          LoggingController: { subscribe: jest.fn() },
          AccountsController: { subscribe: jest.fn() },
          SnapController: { subscribe: jest.fn() },
          SubjectMetadataController: { subscribe: jest.fn() },
          PPOMController: { subscribe: jest.fn() },
          AuthenticationController: { subscribe: jest.fn() },
          UserStorageController: { subscribe: jest.fn() },
          NotificationServicesController: { subscribe: jest.fn() },
          SelectedNetworkController: { subscribe: jest.fn() },
          SnapInterfaceController: { subscribe: jest.fn() },
          SignatureController: { subscribe: jest.fn() },
          TokenSearchDiscoveryController: { subscribe: jest.fn() },
          MultichainBalancesController: { subscribe: jest.fn() },
          RatesController: { subscribe: jest.fn() },
        },
      };
      return mockInstance;
    },
    get context() {
      if (!mockInstance) {
        throw new Error('Engine does not exist');
      }
      return mockInstance.context;
    },
    get controllerMessenger() {
      if (!mockInstance) {
        throw new Error('Engine does not exist');
      }
      return mockInstance.controllerMessenger;
    },
    destroyEngine: jest.fn(async () => {
      mockInstance = null;
    }),
  };

  return {
    __esModule: true,
    default: mockEngine,
  };
});

describe('EngineService', () => {
  let engineService: EngineService;
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Use fake timers to prevent timeout issues after Jest teardown
    jest.useFakeTimers();

    // Mock the store getter by setting the store directly
    const mockStore = {
      getState: () => ({
        engine: { backgroundState: { KeyringController: {} } },
      }),
      dispatch: mockDispatch,
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    } as unknown as ReduxStore;

    // Set the store using the setter
    ReduxService.store = mockStore;

    engineService = new EngineService();
  });

  afterEach(() => {
    // Clean up any pending timers to prevent Jest teardown issues
    try {
      jest.runOnlyPendingTimers();
    } catch {
      // Ignore error if fake timers are not active
    }
    jest.useRealTimers();
  });

  it('should have Engine initialized', async () => {
    engineService.start();
    await waitFor(() => {
      expect(Engine.context).toBeDefined();
    });
  });

  it('should log Engine initialization with state info (existing installation)', async () => {
    // Mock ControllerStorage to return actual state (existing installation)
    (ControllerStorage.getAllPersistedState as jest.Mock).mockResolvedValue({
      backgroundState: {
        KeyringController: { vault: 'encrypted_vault_data' },
        PreferencesController: { selectedAddress: '0x123' },
      },
    });

    engineService.start();
    await waitFor(() => {
      expect(Logger.log).toHaveBeenCalledWith(
        'EngineService: Initializing Engine:',
        {
          hasState: true,
        },
      );
    });
  });

  it('should log Engine initialization with empty state (fresh install)', async () => {
    // Mock ControllerStorage to return empty state (fresh install)
    (ControllerStorage.getAllPersistedState as jest.Mock).mockResolvedValue({
      backgroundState: {},
    });

    // Create a new store with empty engine state for this test
    const mockStoreEmptyState = {
      getState: () => ({ engine: { backgroundState: {} } }),
      dispatch: jest.fn(),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    } as unknown as ReduxStore;

    ReduxService.store = mockStoreEmptyState;

    engineService.start();
    await waitFor(() => {
      expect(Logger.log).toHaveBeenCalledWith(
        'EngineService: Initializing Engine:',
        {
          hasState: false, // Should be false for fresh installs now that the bug is fixed
        },
      );
    });
  });

  it('should have recovered vault on redux store and log initialization', async () => {
    // Use real timers for this test to handle the Promise-based setTimeout
    jest.useRealTimers();

    await engineService.start();
    const { success } = await engineService.initializeVaultFromBackup();
    expect(success).toBeTruthy();
    expect(Engine.context.KeyringController.state.vault).toBeDefined();
    expect(Logger.log).toHaveBeenCalledWith(
      'EngineService: Initializing Engine from backup:',
      {
        hasState: false, // Correctly detects no persisted state now that the bug is fixed
      },
    );

    // Restore fake timers for other tests
    jest.useFakeTimers();
  });

  it('should navigate to vault recovery if Engine fails to initialize', async () => {
    jest.spyOn(Engine, 'init').mockImplementation(() => {
      throw new Error('Failed to initialize Engine');
    });
    engineService.start();

    // Advance timers to trigger the navigation reset setTimeout (150ms)
    jest.advanceTimersByTime(150);

    await waitFor(() => {
      // Logs error to Sentry
      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Failed to initialize Engine'),
        'Failed to initialize Engine! Falling back to vault recovery.',
      );
      // Navigates to vault recovery
      expect(NavigationService.navigation?.reset).toHaveBeenCalledWith({
        routes: [{ name: Routes.VAULT_RECOVERY.RESTORE_WALLET }],
      });
    });
  });

  describe('updateBatcher', () => {
    // Type for accessing private updateBatcher property
    interface EngineServiceWithBatcher {
      updateBatcher: {
        add: (key: string) => void;
      };
    }

    it('should batch initial state key', async () => {
      engineService.start();

      // Access private property with proper typing
      (engineService as unknown as EngineServiceWithBatcher).updateBatcher.add(
        INIT_BG_STATE_KEY,
      );

      // Advance timers to trigger the batch flush
      jest.advanceTimersByTime(250);

      // Wait for batcher to process
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({ type: INIT_BG_STATE_KEY });
      });
    });

    it('should handle UPDATE_BG_STATE_KEY actions in updateBatcher', async () => {
      engineService.start();

      const keys = [
        'KeyringController',
        'PreferencesController',
        'NetworkController',
      ];

      // Add each key - these should now be processed by updateBatcher as UPDATE actions
      keys.forEach((key) => {
        (
          engineService as unknown as EngineServiceWithBatcher
        ).updateBatcher.add(key);
      });

      // Advance timers to trigger the batch flush
      jest.advanceTimersByTime(250);

      // Wait for batcher to process - should now handle UPDATE_BG_STATE_KEY actions
      await waitFor(() => {
        // Each controller name should trigger an UPDATE_BG_STATE_KEY action
        expect(mockDispatch).toHaveBeenCalledTimes(keys.length);
        keys.forEach((key) => {
          expect(mockDispatch).toHaveBeenCalledWith({
            type: UPDATE_BG_STATE_KEY,
            payload: { key },
          });
        });
      });
    });

    it('should handle both INIT and UPDATE actions in updateBatcher', async () => {
      engineService.start();

      // Add both INIT and UPDATE keys
      const serviceWithBatcher =
        engineService as unknown as EngineServiceWithBatcher;
      serviceWithBatcher.updateBatcher.add(INIT_BG_STATE_KEY);
      serviceWithBatcher.updateBatcher.add('KeyringController');
      serviceWithBatcher.updateBatcher.add('PreferencesController');

      // Advance timers to trigger the batch flush
      jest.advanceTimersByTime(250);

      // Wait for batcher to process
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        expect(mockDispatch).toHaveBeenCalledWith({ type: INIT_BG_STATE_KEY });
        expect(mockDispatch).toHaveBeenCalledWith({
          type: UPDATE_BG_STATE_KEY,
          payload: { key: 'KeyringController' },
        });
        expect(mockDispatch).toHaveBeenCalledWith({
          type: UPDATE_BG_STATE_KEY,
          payload: { key: 'PreferencesController' },
        });
      });
    });
  });

  describe('initializeControllers edge cases', () => {
    // Type for accessing private methods
    interface EngineServiceWithInitializeControllers {
      initializeControllers: (engine: {
        context: null;
        controllerMessenger: {
          subscribeOnceIf: jest.MockedFunction<(...args: unknown[]) => void>;
        };
      }) => void;
    }

    it('should handle missing engine context gracefully', () => {
      // Arrange
      const mockEngine = {
        context: null,
        controllerMessenger: {
          subscribeOnceIf: jest.fn(),
        },
      };

      // Act & Assert - should not throw
      expect(() =>
        (
          engineService as unknown as EngineServiceWithInitializeControllers
        ).initializeControllers(mockEngine),
      ).not.toThrow();
      expect(Logger.error).toHaveBeenCalledWith(
        new Error(
          'Engine context does not exists. Redux will not be updated from controller state updates!',
        ),
      );
    });

    it('should handle missing vault metadata in subscribeOnceIf callback', async () => {
      // Types for Engine mock
      interface MockEngineType {
        controllerMessenger: {
          subscribeOnceIf: jest.MockedFunction<(...args: unknown[]) => void>;
        };
        context: {
          KeyringController: {
            metadata?: Record<string, unknown>;
          };
        };
      }

      // Arrange
      await engineService.start();

      const mockEngine = Engine as unknown as MockEngineType;
      const mockSubscribeOnceIf =
        mockEngine.controllerMessenger.subscribeOnceIf;

      // Mock missing vault metadata
      const originalContext = mockEngine.context;
      mockEngine.context = {
        ...originalContext,
        KeyringController: {
          ...originalContext.KeyringController,
          metadata: {}, // No vault metadata
        },
      };

      // Act - trigger the subscribeOnceIf callback
      type SubscribeCall = [string, () => void, () => boolean];
      const subscribeCall = mockSubscribeOnceIf.mock.calls.find(
        (call: unknown[]) => call[0] === 'ComposableController:stateChange',
      ) as SubscribeCall;
      expect(subscribeCall).toBeDefined();

      const callback = subscribeCall[1];
      callback();

      // Assert
      expect(Logger.log).toHaveBeenCalledWith(
        'keyringController vault missing for INIT_BG_STATE_KEY',
      );
    });

    it('should handle missing vault metadata in update callback', async () => {
      // Types for Engine mock
      interface MockEngineType {
        controllerMessenger: {
          subscribe: jest.MockedFunction<(...args: unknown[]) => void>;
        };
        context: {
          KeyringController: {
            metadata?: Record<string, unknown>;
          };
        };
      }

      // Arrange
      await engineService.start();

      const mockEngine = Engine as unknown as MockEngineType;
      const mockSubscribe = mockEngine.controllerMessenger.subscribe;

      // Mock missing vault metadata
      const originalContext = mockEngine.context;
      mockEngine.context = {
        ...originalContext,
        KeyringController: {
          ...originalContext.KeyringController,
          metadata: {}, // No vault metadata
        },
      };

      // Find a Redux update subscription (not persistence subscription)
      type SubscribeCall =
        | [string, () => void]
        | [string, () => void, () => unknown];
      const reduxUpdateCall = mockSubscribe.mock.calls.find(
        (call: unknown[]) =>
          call[0] === 'KeyringController:stateChange' && call.length === 2, // Redux update has 2 args, persistence has 3
      ) as SubscribeCall;
      expect(reduxUpdateCall).toBeDefined();

      // Act - trigger the callback
      const callback = reduxUpdateCall[1];
      callback();

      // Assert
      expect(Logger.log).toHaveBeenCalledWith(
        'keyringController vault missing for UPDATE_BG_STATE_KEY',
      );
    });

    it('should skip CronjobController events', async () => {
      // Types for Engine mock
      interface MockEngineType {
        controllerMessenger: {
          subscribe: jest.MockedFunction<(...args: unknown[]) => void>;
        };
      }

      // Arrange - mock BACKGROUND_STATE_CHANGE_EVENT_NAMES to include CronjobController
      // Temporarily mock the event names array to include CronjobController
      const mockEventNames = [
        ...BACKGROUND_STATE_CHANGE_EVENT_NAMES,
        'CronjobController:stateChange',
      ] as const;

      // Mock the module to return our modified event names
      jest.doMock('../Engine/constants', () => ({
        BACKGROUND_STATE_CHANGE_EVENT_NAMES: mockEventNames,
      }));

      // Act
      await engineService.start();

      const mockEngine = Engine as unknown as MockEngineType;
      const mockSubscribe = mockEngine.controllerMessenger.subscribe;

      // Assert - CronjobController should not be subscribed to
      const cronjobSubscriptions = mockSubscribe.mock.calls.filter(
        (call: unknown[]) => call[0] === 'CronjobController:stateChange',
      );
      expect(cronjobSubscriptions).toHaveLength(0);

      // Clean up the mock
      jest.dontMock('../Engine/constants');
    });
  });

  describe('start method conditions', () => {
    it('should handle existing user with vault check', async () => {
      // Arrange
      const mockGetState = jest.fn().mockReturnValue({
        user: { existingUser: true },
        engine: {
          backgroundState: {
            KeyringController: { vault: 'encrypted-vault-data' },
          },
        },
      });

      Object.defineProperty(ReduxService.store, 'getState', {
        value: mockGetState,
        writable: true,
        configurable: true,
      });

      // Act
      await engineService.start();

      // Assert
      expect(Logger.log).toHaveBeenCalledWith(
        'EngineService: Is vault defined at KeyringController before Enging init: ',
        true,
      );
    });

    it('should handle existing user without vault', async () => {
      // Arrange
      const mockGetState = jest.fn().mockReturnValue({
        user: { existingUser: true },
        engine: {
          backgroundState: {
            KeyringController: {}, // No vault
          },
        },
      });

      Object.defineProperty(ReduxService.store, 'getState', {
        value: mockGetState,
        writable: true,
        configurable: true,
      });

      // Act
      await engineService.start();

      // Assert
      expect(Logger.log).toHaveBeenCalledWith(
        'EngineService: Is vault defined at KeyringController before Enging init: ',
        false,
      );
    });

    it('should handle new user (no existing user flag)', async () => {
      // Arrange
      const mockGetState = jest.fn().mockReturnValue({
        user: { existingUser: false },
      });

      Object.defineProperty(ReduxService.store, 'getState', {
        value: mockGetState,
        writable: true,
        configurable: true,
      });

      // Act
      await engineService.start();

      // Assert
      // Should not call the vault check log for new users
      const vaultCheckLogs = (
        Logger.log as jest.MockedFunction<typeof Logger.log>
      ).mock.calls.filter((call) =>
        call[0]?.includes?.('Is vault defined at KeyringController'),
      );
      expect(vaultCheckLogs).toHaveLength(0);
    });
  });

  describe('setupEnginePersistence', () => {
    const mockCreatePersistController =
      createPersistController as jest.MockedFunction<
        typeof createPersistController
      >;
    const mockGetPersistentState = getPersistentState as jest.MockedFunction<
      typeof getPersistentState
    >;
    let mockPersistController: jest.MockedFunction<
      (filteredState: unknown, controllerName: string) => Promise<void>
    >;

    beforeEach(() => {
      jest.clearAllMocks();
      mockPersistController = jest.fn().mockResolvedValue(undefined);
      // Add debounced function properties to match DebouncedFunc type
      Object.assign(mockPersistController, {
        cancel: jest.fn(),
        flush: jest.fn(),
      });
      mockCreatePersistController.mockReturnValue(
        mockPersistController as unknown as ReturnType<
          typeof createPersistController
        >,
      );
      mockGetPersistentState.mockReturnValue({ filtered: 'state' });

      // Mock Engine.context for metadata - this will be used by the existing Engine mock
      Object.defineProperty(Engine, 'context', {
        value: {
          KeyringController: {
            metadata: {
              field1: { persist: true, anonymous: false },
              field2: { persist: false, anonymous: true },
            },
          },
        },
        writable: true,
        configurable: true,
      });
    });

    it('should set up persistence subscriptions for controllers with persistent state', async () => {
      // Act
      await engineService.start();

      // Assert
      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;

      // Should subscribe to controllers that have persistent state
      // Based on the mock setup: KeyringController, PreferencesController, NetworkController
      // (KeyringController appears twice due to test setup)
      expect(mockSubscribe).toHaveBeenCalledTimes(4);

      // Should NOT subscribe to CronjobController
      const subscribedEvents = (mockSubscribe as jest.Mock).mock.calls.map(
        (call) => call[0],
      );
      expect(subscribedEvents).not.toContain('CronjobController:stateChange');

      expect(Logger.log).toHaveBeenCalledWith(
        'Individual controller persistence subscriptions set up successfully',
      );
    });

    it('should create persist controller with correct debounce time', async () => {
      // Act
      await engineService.start();

      // Assert
      expect(mockCreatePersistController).toHaveBeenCalledWith(200);
    });

    it('should skip CronjobController state change events', async () => {
      // Act
      await engineService.start();

      // Assert
      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;

      // Should not subscribe to CronjobController:stateChange (since it's not in our mocked events)
      // Our mocked BACKGROUND_STATE_CHANGE_EVENT_NAMES only includes KeyringController, PreferencesController, NetworkController
      expect(mockSubscribe).not.toHaveBeenCalledWith(
        'CronjobController:stateChange',
        expect.any(Function),
      );

      // Should only subscribe to controllers with persistent state
      expect(mockSubscribe).toHaveBeenCalledTimes(4); // KeyringController (2x), PreferencesController, NetworkController
    });

    it('should handle controller state changes correctly', async () => {
      // Arrange
      await engineService.start();

      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;

      // Find the persistence subscription for KeyringController
      const keyringControllerCalls = mockSubscribe.mock.calls.filter(
        (call) => call[0] === 'KeyringController:stateChange',
      );

      expect(keyringControllerCalls.length).toBeGreaterThan(0);

      // Get the LAST subscription (from setupEnginePersistence, not initializeControllers)
      const persistenceSubscription =
        keyringControllerCalls[keyringControllerCalls.length - 1];
      expect(persistenceSubscription).toBeDefined();

      // Extract the handler (second parameter)
      const handler = persistenceSubscription?.[1] as (
        controllerState: unknown,
      ) => Promise<void>;
      expect(handler).toBeDefined();

      // Act - call the handler with the controller state
      const controllerState = { field1: 'value1', field2: 'value2' };
      await handler(controllerState);

      // Assert - verify getPersistentState was called inside the handler
      expect(mockGetPersistentState).toHaveBeenCalledWith(
        controllerState,
        Engine.context.KeyringController?.metadata,
      );

      // Verify persistence was called with the filtered state
      expect(mockPersistController).toHaveBeenCalledWith(
        { filtered: 'state' },
        'KeyringController',
      );
    });

    it('logs persistence errors without crashing (graceful degradation)', async () => {
      // Arrange
      const persistError = new Error('Persistence failed');
      mockPersistController.mockRejectedValue(persistError);

      await engineService.start();

      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;

      // Find the persistence subscription callback for KeyringController
      const keyringControllerCalls = mockSubscribe.mock.calls.filter(
        (call) => call[0] === 'KeyringController:stateChange',
      );

      // Use the last subscription callback (which should be from setupEnginePersistence)
      const subscriptionCallback = keyringControllerCalls[
        keyringControllerCalls.length - 1
      ]?.[1] as (controllerState: unknown) => Promise<void>;

      expect(subscriptionCallback).toBeDefined();

      const controllerState = { field1: 'value1' };

      // Act - call the handler with failing persistence
      await subscriptionCallback(controllerState);

      // Assert - logs error but does NOT throw (graceful degradation)
      expect(Logger.error).toHaveBeenCalledWith(
        persistError,
        'Failed to persist KeyringController state during state change',
      );
    });

    it('skips persistence setup for controllers without persistent state', async () => {
      // Arrange - Mock a controller with NO persistent state (all persist: false)
      Object.defineProperty(Engine, 'context', {
        value: {
          KeyringController: {
            metadata: {
              field1: { persist: false, anonymous: false },
              field2: { persist: false, anonymous: false },
            },
          },
          PreferencesController: {
            metadata: {
              field1: { persist: true, anonymous: false },
            },
          },
          NetworkController: {
            metadata: {}, // Empty metadata = no persistent state
          },
        },
        writable: true,
        configurable: true,
      });

      // Act
      await engineService.start();

      // Assert - Verify log messages about skipping controllers without persistent state
      expect(Logger.log).toHaveBeenCalledWith(
        'Skipping persistence setup for KeyringController, no persistent state',
      );
      expect(Logger.log).toHaveBeenCalledWith(
        'Skipping persistence setup for NetworkController, no persistent state',
      );

      // Verify that PreferencesController did NOT get skipped (it has persistent state)
      const skipMessages = (
        Logger.log as jest.MockedFunction<typeof Logger.log>
      ).mock.calls.filter((call) =>
        call[0]?.includes?.(
          'Skipping persistence setup for PreferencesController',
        ),
      );
      expect(skipMessages).toHaveLength(0);
    });

    it('should handle missing controllerMessenger gracefully', async () => {
      // Arrange
      Object.defineProperty(Engine, 'controllerMessenger', {
        value: null,
        writable: true,
        configurable: true,
      });

      // Act & Assert - should not throw
      await expect(engineService.start()).resolves.toBeUndefined();

      // Should not log success message
      expect(Logger.log).not.toHaveBeenCalledWith(
        'Individual controller persistence subscriptions set up successfully',
      );
    });
  });
});
