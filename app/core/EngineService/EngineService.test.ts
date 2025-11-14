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

jest.mock('../Engine', () => {
  // Do not need to mock entire Engine. Only need subset of data for testing purposes.
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let instance: any;

  const mockEngine = {
    init: (_: unknown, keyringState: KeyringControllerState) => {
      instance = {
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
      return instance;
    },
    get context() {
      if (!instance) {
        throw new Error('Engine does not exist');
      }
      return instance.context;
    },
    get controllerMessenger() {
      if (!instance) {
        throw new Error('Engine does not exist');
      }
      return instance.controllerMessenger;
    },
    destroyEngine: jest.fn(async () => {
      instance = null;
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
    it('should batch initial state key', async () => {
      engineService.start();

      // @ts-expect-error - accessing private property for testing
      engineService.updateBatcher.add(INIT_BG_STATE_KEY);

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
        // @ts-expect-error - accessing private property for testing
        engineService.updateBatcher.add(key);
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
      // @ts-expect-error - accessing private property for testing
      engineService.updateBatcher.add(INIT_BG_STATE_KEY);
      // @ts-expect-error - accessing private property for testing
      engineService.updateBatcher.add('KeyringController');
      // @ts-expect-error - accessing private property for testing
      engineService.updateBatcher.add('PreferencesController');

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

    it('should set up persistence subscriptions for all controller events', async () => {
      // Act
      await engineService.start();

      // Assert
      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;

      // Should subscribe to all events except CronjobController:stateChange
      const expectedCallCount = BACKGROUND_STATE_CHANGE_EVENT_NAMES.filter(
        (eventName) => eventName !== 'CronjobController:stateChange',
      ).length;

      expect(mockSubscribe).toHaveBeenCalledTimes(expectedCallCount);

      // Verify it subscribes to each event (except CronjobController)
      BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
        if (eventName !== 'CronjobController:stateChange') {
          expect(mockSubscribe).toHaveBeenCalledWith(
            eventName,
            expect.any(Function),
          );
        }
      });

      expect(Logger.log).toHaveBeenCalledWith(
        'Individual controller persistence and Redux update subscriptions set up successfully',
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

      // Should only subscribe to the events we have in our mock
      expect(mockSubscribe).toHaveBeenCalledTimes(3); // KeyringController, PreferencesController, NetworkController
    });

    it('should handle controller state changes correctly', async () => {
      // Arrange
      await engineService.start();

      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;

      // Find the subscription callback for KeyringController
      const subscriptionCallback = mockSubscribe.mock.calls.find(
        (call) => call[0] === 'KeyringController:stateChange',
      )?.[1] as (controllerState: unknown) => Promise<void>;

      expect(subscriptionCallback).toBeDefined();

      const controllerState = { field1: 'value1', field2: 'value2' };

      // Act
      await subscriptionCallback(controllerState);

      // Assert
      expect(mockGetPersistentState).toHaveBeenCalledWith(
        controllerState,
        Engine.context.KeyringController?.metadata,
      );

      // Verify that the persistence function was called
      expect(mockPersistController).toHaveBeenCalledWith(
        { filtered: 'state' },
        'KeyringController',
      );
    });

    it('should handle persistence errors gracefully', async () => {
      // Arrange
      const persistError = new Error('Persistence failed');
      mockPersistController.mockRejectedValue(persistError);

      await engineService.start();

      const mockSubscribe = Engine.controllerMessenger
        .subscribe as jest.MockedFunction<
        typeof Engine.controllerMessenger.subscribe
      >;
      const subscriptionCallback = mockSubscribe.mock.calls.find(
        (call) => call[0] === 'KeyringController:stateChange',
      )?.[1] as (controllerState: unknown) => Promise<void>;

      expect(subscriptionCallback).toBeDefined();

      const controllerState = { field1: 'value1' };

      // Act & Assert - should not throw
      await expect(
        subscriptionCallback(controllerState),
      ).resolves.toBeUndefined();

      // Should log error
      expect(Logger.error).toHaveBeenCalledWith(
        persistError,
        'Failed to process KeyringController state change',
      );
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
        'Individual controller persistence and Redux update subscriptions set up successfully',
      );
    });
  });
});
