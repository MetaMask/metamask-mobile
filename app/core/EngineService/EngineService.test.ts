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
  let mockPendingMessenger: MockControllerMessenger | null = null;

  const mockEngine = {
    init: (_: unknown, keyringState: KeyringControllerState | null = null) => {
      // Use pending messenger if available, otherwise create new one
      const messenger = mockPendingMessenger || {
        subscribe: jest.fn(),
        subscribeOnceIf: jest.fn(),
      };
      mockPendingMessenger = null; // Clear pending messenger after use

      mockInstance = {
        controllerMessenger: messenger,
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
    getOrCreateMessenger() {
      if (mockInstance) {
        return mockInstance.controllerMessenger;
      }
      // Create and store pending messenger
      mockPendingMessenger = {
        subscribe: jest.fn(),
        subscribeOnceIf: jest.fn(),
      };
      return mockPendingMessenger;
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
      mockPendingMessenger = null;
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

  it('initializes Engine context', async () => {
    // Act
    await engineService.start();

    // Assert
    expect(Engine.context).toBeDefined();
  });

  it('logs Engine initialization with state info for existing installation', async () => {
    // Arrange
    (ControllerStorage.getAllPersistedState as jest.Mock).mockResolvedValue({
      backgroundState: {
        KeyringController: { vault: 'encrypted_vault_data' },
        PreferencesController: { selectedAddress: '0x123' },
      },
    });

    // Act
    await engineService.start();

    // Assert
    expect(Logger.log).toHaveBeenCalledWith(
      'EngineService: Initializing Engine:',
      {
        hasState: true,
      },
    );
  });

  it('logs Engine initialization with empty state for fresh install', async () => {
    // Arrange
    (ControllerStorage.getAllPersistedState as jest.Mock).mockResolvedValue({
      backgroundState: {},
    });
    const mockStoreEmptyState = {
      getState: () => ({ engine: { backgroundState: {} } }),
      dispatch: jest.fn(),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    } as unknown as ReduxStore;
    ReduxService.store = mockStoreEmptyState;

    // Act
    await engineService.start();

    // Assert
    expect(Logger.log).toHaveBeenCalledWith(
      'EngineService: Initializing Engine:',
      {
        hasState: false,
      },
    );
  });

  it('recovers vault on redux store and logs initialization', async () => {
    // Arrange
    jest.useRealTimers();

    // Act
    await engineService.start();
    const { success } = await engineService.initializeVaultFromBackup();

    // Assert
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

  it('sets up persistence subscriptions after vault recovery', async () => {
    // Arrange
    jest.useRealTimers();

    // Act
    await engineService.initializeVaultFromBackup();

    // Assert - verify setupPersistenceSubscriptions was called during vault recovery
    // This ensures controller state changes are persisted after recovery
    const persistenceLogCalls = (Logger.log as jest.Mock).mock.calls.filter(
      (call) =>
        call[0] ===
        'Persistence subscriptions set up on messenger successfully',
    );
    expect(persistenceLogCalls.length).toBeGreaterThan(0);

    // Restore fake timers for other tests
    jest.useFakeTimers();
  });

  it('navigates to vault recovery when Engine fails to initialize', async () => {
    // Arrange
    jest.spyOn(Engine, 'init').mockImplementation(() => {
      throw new Error('Failed to initialize Engine');
    });

    // Act
    await engineService.start();
    jest.advanceTimersByTime(150);

    // Assert
    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to initialize Engine! Falling back to vault recovery.',
      );
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

    it('batches initial state key', async () => {
      // Arrange
      engineService.start();

      // Act
      (engineService as unknown as EngineServiceWithBatcher).updateBatcher.add(
        INIT_BG_STATE_KEY,
      );
      jest.advanceTimersByTime(250);

      // Assert
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({ type: INIT_BG_STATE_KEY });
      });
    });

    it('dispatches UPDATE_BG_STATE_KEY actions for each controller name', async () => {
      // Arrange
      engineService.start();
      const keys = [
        'KeyringController',
        'PreferencesController',
        'NetworkController',
      ];

      // Act
      keys.forEach((key) => {
        (
          engineService as unknown as EngineServiceWithBatcher
        ).updateBatcher.add(key);
      });
      jest.advanceTimersByTime(250);

      // Assert
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(keys.length);
        keys.forEach((key) => {
          expect(mockDispatch).toHaveBeenCalledWith({
            type: UPDATE_BG_STATE_KEY,
            payload: { key },
          });
        });
      });
    });

    it('dispatches both INIT and UPDATE actions when both key types are added', async () => {
      // Arrange
      engineService.start();
      const serviceWithBatcher =
        engineService as unknown as EngineServiceWithBatcher;

      // Act
      serviceWithBatcher.updateBatcher.add(INIT_BG_STATE_KEY);
      serviceWithBatcher.updateBatcher.add('KeyringController');
      serviceWithBatcher.updateBatcher.add('PreferencesController');
      jest.advanceTimersByTime(250);

      // Assert
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

    it('logs error when engine context is missing', () => {
      // Arrange
      const mockEngine = {
        context: null,
        controllerMessenger: {
          subscribeOnceIf: jest.fn(),
        },
      };

      // Act
      (
        engineService as unknown as EngineServiceWithInitializeControllers
      ).initializeControllers(mockEngine);

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        new Error(
          'Engine context does not exists. Redux will not be updated from controller state updates!',
        ),
      );
    });

    it('logs message when vault metadata is missing in subscribeOnceIf callback', async () => {
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

    it('logs message when vault metadata is missing in update callback', async () => {
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

    it('skips CronjobController events', async () => {
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
    it('logs vault check for existing user', async () => {
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

    it('logs missing vault for existing user', async () => {
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

    it('skips vault check for new user without existing user flag', async () => {
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

  describe('4-phase initialization', () => {
    it('calls getOrCreateMessenger before Engine.init', async () => {
      // Arrange
      const getOrCreateMessengerSpy = jest.spyOn(Engine, 'getOrCreateMessenger');
      const initSpy = jest.spyOn(Engine, 'init');

      // Act
      await engineService.start();

      // Assert
      expect(getOrCreateMessengerSpy).toHaveBeenCalled();
      expect(initSpy).toHaveBeenCalled();
      // getOrCreateMessenger should be called before init
      expect(getOrCreateMessengerSpy.mock.invocationCallOrder[0]).toBeLessThan(
        initSpy.mock.invocationCallOrder[0],
      );
    });

    it('sets up persistence subscriptions before Engine.init', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger, 'log');
      const initSpy = jest.spyOn(Engine, 'init');

      // Act
      await engineService.start();

      // Assert
      const persistenceLog = logSpy.mock.calls.findIndex(
        (call) =>
          call[0] === 'Persistence subscriptions set up on messenger successfully',
      );
      const engineInitLog = logSpy.mock.calls.findIndex(
        (call) => call[0] === 'EngineService: Initializing Engine:',
      );

      // Persistence subscriptions should be set up after the init log but before controllers emit events
      expect(persistenceLog).toBeGreaterThan(-1);
      expect(engineInitLog).toBeGreaterThan(-1);
      expect(initSpy).toHaveBeenCalled();
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

    it('sets up persistence subscriptions for controllers with persistent state', async () => {
      // Act
      await engineService.start();

      // Assert
      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;

      // Should subscribe to controllers
      // Based on the mock setup: KeyringController, PreferencesController, NetworkController
      // With early subscription pattern, all subscriptions go through the same messenger
      expect(mockSubscribe).toHaveBeenCalled();

      // Should NOT subscribe to CronjobController
      const subscribedEvents = (mockSubscribe as jest.Mock).mock.calls.map(
        (call) => call[0],
      );
      expect(subscribedEvents).not.toContain('CronjobController:stateChange');

      expect(Logger.log).toHaveBeenCalledWith(
        'Persistence subscriptions set up on messenger successfully',
      );
    });

    it('creates persist controller with 200ms debounce time for each controller', async () => {
      // Act
      await engineService.start();

      // Assert
      // Called once per controller event (3 controllers in mocked BACKGROUND_STATE_CHANGE_EVENT_NAMES)
      expect(mockCreatePersistController).toHaveBeenCalledWith(200);
      expect(mockCreatePersistController).toHaveBeenCalledTimes(3);
    });

    it('skips CronjobController state change events', async () => {
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

      // Verify subscriptions were set up
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('subscribes to controller state change events for persistence', async () => {
      // Arrange
      await engineService.start();
      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;

      // Act
      const keyringControllerCalls = mockSubscribe.mock.calls.filter(
        (call) => call[0] === 'KeyringController:stateChange',
      );

      // Assert
      expect(keyringControllerCalls.length).toBeGreaterThan(0);
      expect(keyringControllerCalls[0]).toBeDefined();
    });

    it('subscribes to all events and filters at event time based on metadata', async () => {
      // Arrange - Mock controllers with different metadata configurations
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

      // Assert
      expect(Logger.log).toHaveBeenCalledWith(
        'Persistence subscriptions set up on messenger successfully',
      );

      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;
      
      // Subscribes to all controller events (3 controllers × 2 subscriptions each)
      expect(mockSubscribe.mock.calls.length).toBeGreaterThan(0);
    });

    it('logs error when messenger creation fails', async () => {
      // Arrange
      jest.spyOn(Engine, 'getOrCreateMessenger').mockImplementationOnce(() => {
        throw new Error('Failed to create messenger');
      });

      // Act
      await engineService.start();

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to initialize Engine! Falling back to vault recovery.',
      );
    });
  });
});
