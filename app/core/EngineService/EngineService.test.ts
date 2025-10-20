import { waitFor } from '@testing-library/react-native';
import { EngineService } from './EngineService';
import ReduxService, { type ReduxStore } from '../redux';
import Engine from '../Engine';
import { type KeyringControllerState } from '@metamask/keyring-controller';
import NavigationService from '../NavigationService';
import Logger from '../../util/Logger';
import Routes from '../../constants/navigation/Routes';
import { INIT_BG_STATE_KEY, UPDATE_BG_STATE_KEY } from './constants';

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
            metadata: { vault: keyringState?.vault || 'test_vault' },
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
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        engine: { backgroundState: { KeyringController: {} } },
      }),
      dispatch: mockDispatch,
    } as unknown as ReduxStore);

    engineService = new EngineService();
  });

  it('should have Engine initialized', async () => {
    engineService.start();
    await waitFor(() => {
      expect(Engine.context).toBeDefined();
    });
  });

  it('should log Engine initialization with state info', async () => {
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

  it('should log Engine initialization with empty state', async () => {
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ engine: { backgroundState: {} } }),
      dispatch: jest.fn(),
    } as unknown as ReduxStore);

    engineService.start();
    await waitFor(() => {
      expect(Logger.log).toHaveBeenCalledWith(
        'EngineService: Initializing Engine:',
        {
          hasState: false,
        },
      );
    });
  });

  it('should have recovered vault on redux store and log initialization', async () => {
    await engineService.start();
    const { success } = await engineService.initializeVaultFromBackup();
    expect(success).toBeTruthy();
    expect(Engine.context.KeyringController.state.vault).toBeDefined();
    expect(Logger.log).toHaveBeenCalledWith(
      'EngineService: Initializing Engine from backup:',
      {
        hasState: true,
      },
    );
  });

  it('should navigate to vault recovery if Engine fails to initialize', async () => {
    jest.spyOn(Engine, 'init').mockImplementation(() => {
      throw new Error('Failed to initialize Engine');
    });
    engineService.start();
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

  describe('existing user vault check', () => {
    it('should log vault status when user is an existing user', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          user: { existingUser: true },
          engine: {
            backgroundState: {
              KeyringController: { vault: 'encrypted_vault_string' },
            },
          },
        }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);

      engineService.start();

      await waitFor(() => {
        expect(Logger.log).toHaveBeenCalledWith(
          'EngineService: Is vault defined at KeyringController before Enging init: ',
          true,
        );
      });
    });

    it('should log vault as undefined when existing user has no vault', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          user: { existingUser: true },
          engine: {
            backgroundState: {
              KeyringController: {},
            },
          },
        }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);

      engineService.start();

      await waitFor(() => {
        expect(Logger.log).toHaveBeenCalledWith(
          'EngineService: Is vault defined at KeyringController before Enging init: ',
          false,
        );
      });
    });
  });

  describe('updateControllers edge cases', () => {
    it('should log error and return early when engine context does not exist', async () => {
      const originalInit = Engine.init;
      jest.spyOn(Engine, 'init').mockImplementation((...args) => {
        const result = originalInit(...args);
        Object.defineProperty(Engine, 'context', {
          get: () => null,
          configurable: true,
        });
        return result;
      });

      await engineService.start();

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          new Error(
            'Engine context does not exists. Redux will not be updated from controller state updates!',
          ),
        );
      });
    });

    it('should skip CronjobController state change events', async () => {
      await engineService.start();

      const subscribeCalls = Engine.controllerMessenger.subscribe.mock.calls;
      const cronjobCalls = subscribeCalls.filter(
        (call: unknown[]) => call[0] === 'CronjobController:stateChange',
      );
      expect(cronjobCalls).toHaveLength(0);
    });
  });

  describe('updateBatcher', () => {
    it('should batch initial state key', async () => {
      engineService.start();

      // @ts-expect-error - accessing private property for testing
      engineService.updateBatcher.add(INIT_BG_STATE_KEY);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({ type: INIT_BG_STATE_KEY });
      });
    });

    it('should batch multiple update keys', async () => {
      engineService.start();

      const keys = [
        'KeyringController',
        'PreferencesController',
        'NetworkController',
      ];

      keys.forEach((key) => {
        // @ts-expect-error - accessing private property for testing
        engineService.updateBatcher.add(key);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(keys.length); // 3 keys
        keys.forEach((key, index) => {
          expect(mockDispatch).toHaveBeenNthCalledWith(index + 1, {
            type: UPDATE_BG_STATE_KEY,
            payload: { key },
          });
        });
      });
    });
  });
});
