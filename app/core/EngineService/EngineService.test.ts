import { waitFor } from '@testing-library/react-native';
import { EngineService } from './EngineService';
import ReduxService, { type ReduxStore } from '../redux';
import Engine from '../Engine';
import { type KeyringControllerState } from '@metamask/keyring-controller';
import NavigationService from '../NavigationService';
import Logger from '../../util/Logger';
import Routes from '../../constants/navigation/Routes';

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
          SignatureController: { subscribe: jest.fn() },
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        engine: { backgroundState: { KeyringController: {} } },
      }),
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
});
