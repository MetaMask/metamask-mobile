import { MarketDataDetails } from '@metamask/assets-controllers';
import Engine, { Engine as EngineClass } from './Engine';
import { EngineState } from './types';
import { backgroundState } from '../../util/test/initial-root-state';
import { InitializationState } from '../../components/UI/Perps/controllers';
import { zeroAddress } from 'ethereumjs-util';
import {
  createMockAccountsControllerState,
  createMockInternalAccount,
  MOCK_ADDRESS_1,
} from '../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../util/test/network';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { KeyringControllerState } from '@metamask/keyring-controller';
import { NetworkController } from '@metamask/network-controller';
import { ClientConfigApiService } from '@metamask/remote-feature-flag-controller';
import { backupVault } from '../BackupVault';
import { getVersion } from 'react-native-device-info';
import { version as migrationVersion } from '../../store/migrations';
import { AppState, AppStateStatus } from 'react-native';
import ReduxService from '../redux';
import configureStore from '../../util/test/configureStore';
import { SnapKeyring } from '@metamask/eth-snap-keyring';
import { isEmpty } from 'lodash';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.44.0'),
}));

jest.mock('../BackupVault', () => ({
  backupVault: jest.fn().mockResolvedValue({ success: true, vault: 'vault' }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
}));
jest.unmock('./Engine');
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              rewards: true,
            },
          },
        },
      },
    })),
  },
}));
jest.mock('../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn().mockReturnValue(false),
  selectSmartTransactionsEnabled: jest.fn().mockReturnValue(false),
  selectPendingSmartTransactionsBySender: jest.fn().mockReturnValue([]),
  selectPendingSmartTransactionsForSelectedAccountGroup: jest
    .fn()
    .mockReturnValue([]),
}));
jest.mock('../../selectors/settings', () => ({
  ...jest.requireActual('../../selectors/settings'),
  selectBasicFunctionalityEnabled: jest.fn().mockReturnValue(true),
}));
jest.mock('../../util/phishingDetection', () => ({
  isProductSafetyDappScanningEnabled: jest.fn().mockReturnValue(false),
  getPhishingTestResult: jest.fn().mockReturnValue({ result: true }),
}));

jest.mock('@metamask/assets-controllers', () => {
  const actualControllers = jest.requireActual('@metamask/assets-controllers');
  // Mock the RatesController start method since it takes a while to run and causes timeouts in tests
  class MockRatesController extends actualControllers.RatesController {
    start = jest.fn().mockImplementation(() => Promise.resolve());
  }
  return {
    ...actualControllers,
    RatesController: MockRatesController,
  };
});

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  ...jest.requireActual('@metamask/remote-feature-flag-controller'),
  ClientConfigApiService: jest.fn().mockReturnValue({
    remoteFeatureFlags: {},
    cacheTimestamp: 0,
  }),
}));

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  rejectOriginApprovals: jest.fn(),
}));

const ClientConfigApiServiceMock = jest.mocked(ClientConfigApiService);

describe('Engine', () => {
  // Create a shared mock account for tests
  const validAddress = MOCK_ADDRESS_1;
  const mockAccount = createMockInternalAccount(validAddress, 'Test Account');
  const TEST_ANALYTICS_ID = '59710bcf-06cc-4247-9386-12425e7fc905';
  let mockAppStateListener: (state: AppStateStatus) => void;

  beforeEach(() => {
    ReduxService.store = configureStore({});
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    (backupVault as jest.Mock).mockReset();
    await Engine.destroyEngine();
    await EngineClass.instance?.destroyEngineInstance();
  });

  it('should expose an API', () => {
    const engine = Engine.init(TEST_ANALYTICS_ID, {});
    expect(engine.context).toHaveProperty('AccountTrackerController');
    expect(engine.context).toHaveProperty('AddressBookController');
    expect(engine.context).toHaveProperty('AssetsContractController');
    expect(engine.context).toHaveProperty('TokenListController');
    expect(engine.context).toHaveProperty('TokenDetectionController');
    expect(engine.context).toHaveProperty('NftDetectionController');
    expect(engine.context).toHaveProperty('NftController');
    expect(engine.context).toHaveProperty('CurrencyRateController');
    expect(engine.context).toHaveProperty('KeyringController');
    expect(engine.context).toHaveProperty('NetworkController');
    expect(engine.context).toHaveProperty('PhishingController');
    expect(engine.context).toHaveProperty('PreferencesController');
    expect(engine.context).toHaveProperty('RemoteFeatureFlagController');
    expect(engine.context).toHaveProperty('SignatureController');
    expect(engine.context).toHaveProperty('TokenBalancesController');
    expect(engine.context).toHaveProperty('TokenRatesController');
    expect(engine.context).toHaveProperty('TokensController');
    expect(engine.context).toHaveProperty('LoggingController');
    expect(engine.context).toHaveProperty('TransactionController');
    expect(engine.context).toHaveProperty('SmartTransactionsController');
    expect(engine.context).toHaveProperty('AuthenticationController');
    expect(engine.context).toHaveProperty('UserStorageController');
    expect(engine.context).toHaveProperty('NotificationServicesController');
    expect(engine.context).toHaveProperty('SelectedNetworkController');
    expect(engine.context).toHaveProperty('SnapInterfaceController');
    expect(engine.context).toHaveProperty('MultichainBalancesController');
    expect(engine.context).toHaveProperty('MultichainNetworkController');
    expect(engine.context).toHaveProperty('BridgeController');
    expect(engine.context).toHaveProperty('BridgeStatusController');
    expect(engine.context).toHaveProperty('EarnController');
    expect(engine.context).toHaveProperty('MultichainTransactionsController');
    expect(engine.context).toHaveProperty('DeFiPositionsController');
    expect(engine.context).toHaveProperty('NetworkEnablementController');
    expect(engine.context).toHaveProperty('PerpsController');
    expect(engine.context).toHaveProperty('GatorPermissionsController');
    expect(engine.context).toHaveProperty('RampsController');
    expect(engine.context).toHaveProperty('RampsService');
    expect(engine.context).toHaveProperty('ConnectivityController');
  });

  it('calling Engine.init twice returns the same instance', () => {
    const engine = Engine.init(TEST_ANALYTICS_ID, {});
    const newEngine = Engine.init(TEST_ANALYTICS_ID, {});
    expect(engine).toStrictEqual(newEngine);
  });

  it('should backup vault when Engine is initialized and vault exists', () => {
    (backupVault as jest.Mock).mockResolvedValue({
      success: true,
      vault: 'vault',
    });
    const engine = Engine.init(TEST_ANALYTICS_ID, {});
    const newEngine = Engine.init(TEST_ANALYTICS_ID, {});
    expect(engine).toStrictEqual(newEngine);
    // @ts-expect-error accessing protected property for testing
    engine.keyringController.messenger.publish(
      'KeyringController:stateChange',
      {
        vault: 'vault',
        isUnlocked: false,
        keyrings: [],
      },
      [],
    );
    expect(backupVault).toHaveBeenCalled();
  });

  it('should not backup vault when Engine is initialized and vault is empty', () => {
    // backupVault will not be called so return value doesn't matter here
    (backupVault as jest.Mock).mockResolvedValue(undefined);
    const engine = Engine.init(TEST_ANALYTICS_ID, {});
    const newEngine = Engine.init(TEST_ANALYTICS_ID, {});
    expect(engine).toStrictEqual(newEngine);
    // @ts-expect-error accessing protected property for testing
    engine.keyringController.messenger.publish(
      'KeyringController:stateChange',
      {
        vault: undefined,
        isUnlocked: false,
        keyrings: [],
      } as KeyringControllerState,
      [],
    );
    expect(backupVault).not.toHaveBeenCalled();
  });

  it('calling Engine.destroy deletes the old instance', async () => {
    const engine = Engine.init(TEST_ANALYTICS_ID, {});
    await engine.destroyEngineInstance();
    const newEngine = Engine.init(TEST_ANALYTICS_ID, {});
    expect(engine).not.toStrictEqual(newEngine);
  });

  // Use this to keep the unit test initial background state fixture up-to-date
  it('matches initial state fixture', () => {
    const engine = Engine.init(TEST_ANALYTICS_ID, {});
    const initialBackgroundState = engine.datamodel.state;

    // Get the current app version and migration version
    const currentAppVersion = getVersion();
    const currentMigrationVersion = migrationVersion;

    // Create expected state by merging the static fixture with current AppMetadataController state
    const expectedState = {
      ...backgroundState,
      AccountTrackerController: {
        ...backgroundState.AccountTrackerController,
        // This is just hotfix, because it should not be empty but it reflects current state of Engine code
        // More info: https://github.com/MetaMask/metamask-mobile/pull/18949
        accountsByChainId: {},
      },
      AnalyticsController: {
        analyticsId: TEST_ANALYTICS_ID,
        optedIn: false,
      },
      AppMetadataController: {
        currentAppVersion,
        previousAppVersion: '', // This will be managed by the controller
        previousMigrationVersion: 0, // This will be managed by the controller
        currentMigrationVersion,
      },
      PredictController: {
        eligibility: {},
        lastError: null,
        lastUpdateTimestamp: 0,
        balances: {},
        claimablePositions: {},
        pendingDeposits: {},
        withdrawTransaction: null,
        accountMeta: {},
      },
      GatorPermissionsController: {
        gatorPermissionsMapSerialized: JSON.stringify({
          'native-token-stream': {},
          'native-token-periodic': {},
          'erc20-token-stream': {},
          'erc20-token-periodic': {},
          other: {},
        }),
        gatorPermissionsProviderSnapId: 'npm:@metamask/gator-permissions-snap',
        isFetchingGatorPermissions: false,
        isGatorPermissionsEnabled: false,
      },
      PerpsController: {
        ...backgroundState.PerpsController,
        depositRequests: [],
        withdrawalRequests: [],
        withdrawalProgress: {
          progress: 0,
          lastUpdated: 0,
          activeWithdrawalId: null,
        },
        marketFilterPreferences: 'volume',
        tradeConfigurations: {
          mainnet: {},
          testnet: {},
        },
        watchlistMarkets: {
          mainnet: [],
          testnet: [],
        },
        hip3ConfigVersion: 0,
        initializationState: InitializationState.UNINITIALIZED,
        initializationError: null,
        initializationAttempts: 0,
      },
      RampsController: {
        ...backgroundState.RampsController,
        tokens: null,
      },
    };

    expect(initialBackgroundState).toStrictEqual(expectedState);
  });

  it('setSelectedAccount throws an error if no account exists for the given address', () => {
    const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);
    const invalidAddress = '0xInvalidAddress';

    expect(() => engine.setSelectedAccount(invalidAddress)).toThrow(
      `No account found for address: ${invalidAddress}`,
    );
  });

  it('setSelectedAccount successfully updates selected account when address exists', () => {
    const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);

    const getAccountByAddressSpy = jest
      .spyOn(engine.context.AccountsController, 'getAccountByAddress')
      .mockReturnValue(mockAccount);

    const setSelectedAccountSpy = jest
      .spyOn(engine.context.AccountsController, 'setSelectedAccount')
      .mockImplementation();

    const setSelectedAddressSpy = jest
      .spyOn(engine.context.PreferencesController, 'setSelectedAddress')
      .mockImplementation();

    engine.setSelectedAccount(validAddress);

    expect(getAccountByAddressSpy).toHaveBeenCalledWith(validAddress);
    expect(setSelectedAccountSpy).toHaveBeenCalledWith(mockAccount.id);
    expect(setSelectedAddressSpy).toHaveBeenCalledWith(validAddress);
  });

  it('setAccountLabel successfully updates account label when address exists', () => {
    const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);
    const label = 'New Account Name';

    const getAccountByAddressSpy = jest
      .spyOn(engine.context.AccountsController, 'getAccountByAddress')
      .mockReturnValue(mockAccount);

    const setAccountNameSpy = jest
      .spyOn(engine.context.AccountsController, 'setAccountName')
      .mockImplementation();

    const setAccountLabelSpy = jest
      .spyOn(engine.context.PreferencesController, 'setAccountLabel')
      .mockImplementation();

    engine.setAccountLabel(validAddress, label);

    expect(getAccountByAddressSpy).toHaveBeenCalledWith(validAddress);
    expect(setAccountNameSpy).toHaveBeenCalledWith(mockAccount.id, label);
    expect(setAccountLabelSpy).toHaveBeenCalledWith(validAddress, label);
  });

  it('setAccountLabel throws an error if no account exists for the given address', () => {
    const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);
    const invalidAddress = '0xInvalidAddress';
    const label = 'Test Account';

    expect(() => engine.setAccountLabel(invalidAddress, label)).toThrow(
      `No account found for address: ${invalidAddress}`,
    );
  });

  it('getSnapKeyring gets or creates a snap keyring', async () => {
    const engine = new EngineClass(TEST_ANALYTICS_ID, backgroundState);
    const mockSnapKeyring = { type: 'Snap Keyring' } as unknown as SnapKeyring;
    jest
      .spyOn(engine.keyringController, 'getKeyringsByType')
      .mockImplementation(() => [mockSnapKeyring]);

    const getSnapKeyringSpy = jest
      .spyOn(engine, 'getSnapKeyring')
      .mockImplementation(async () => mockSnapKeyring);

    const result = await engine.getSnapKeyring();
    expect(getSnapKeyringSpy).toHaveBeenCalled();
    expect(result).toEqual(mockSnapKeyring);
  });

  it('getSnapKeyring creates a new snap keyring if none exists', async () => {
    const engine = new EngineClass(TEST_ANALYTICS_ID, backgroundState);
    const mockSnapKeyring = { type: 'Snap Keyring' } as unknown as SnapKeyring;

    jest
      .spyOn(engine.keyringController, 'getKeyringsByType')
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [mockSnapKeyring]);

    jest
      .spyOn(engine.keyringController, 'addNewKeyring')
      .mockResolvedValue({ id: '1234', name: 'Snap Keyring' });

    const getSnapKeyringSpy = jest
      .spyOn(engine, 'getSnapKeyring')
      .mockImplementation(async () => mockSnapKeyring);

    const result = await engine.getSnapKeyring();
    expect(getSnapKeyringSpy).toHaveBeenCalled();
    expect(result).toEqual(mockSnapKeyring);
  });

  it('normalizes CurrencyController state property conversionRate from null to 0', () => {
    const ticker = 'ETH';
    const state = {
      CurrencyRateController: {
        currentCurrency: 'usd' as const,
        currencyRates: {
          [ticker]: {
            conversionRate: null,
            conversionDate: 0,
            usdConversionRate: null,
          },
        },
      },
    };
    const engine = Engine.init(TEST_ANALYTICS_ID, state);
    expect(
      engine.datamodel.state.CurrencyRateController.currencyRates[ticker],
    ).toStrictEqual({
      conversionRate: 0,
      conversionDate: 0,
      usdConversionRate: null,
    });
  });

  it('enables the RPC failover feature if the walletFrameworkRpcFailoverEnabled feature flag is already enabled', () => {
    const state = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          walletFrameworkRpcFailoverEnabled: true,
        },
        cacheTimestamp: 0,
      },
    };
    const enableRpcFailoverSpy = jest.spyOn(
      NetworkController.prototype,
      'enableRpcFailover',
    );

    Engine.init(TEST_ANALYTICS_ID, state);

    expect(enableRpcFailoverSpy).toHaveBeenCalled();
  });

  it('disables the RPC failover feature if the walletFrameworkRpcFailoverEnabled feature flag is already disabled', () => {
    const state = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          walletFrameworkRpcFailoverEnabled: false,
        },
        cacheTimestamp: 0,
      },
    };
    const disableRpcFailoverSpy = jest.spyOn(
      NetworkController.prototype,
      'disableRpcFailover',
    );

    Engine.init(TEST_ANALYTICS_ID, state);

    expect(disableRpcFailoverSpy).toHaveBeenCalled();
  });

  it('enables the RPC failover feature if the walletFrameworkRpcFailoverEnabled feature flag is enabled later', async () => {
    (Date.now as jest.Mock).mockReturnValue(1000000);
    const state = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          walletFrameworkRpcFailoverEnabled: false,
        },
        cacheTimestamp: 0,
      },
    };
    const keyringState = null;
    const analyticsId = '24d24a09-b210-4971-9601-4603c60b23c3';
    const enableRpcFailoverSpy = jest.spyOn(
      NetworkController.prototype,
      'enableRpcFailover',
    );
    ClientConfigApiServiceMock
      // @ts-expect-error We aren't supplying a complete ClientConfigApiService;
      // all we need to override is `fetchRemoteFeatureFlags`
      .mockReturnValue({
        async fetchRemoteFeatureFlags() {
          return {
            remoteFeatureFlags: {
              walletFrameworkRpcFailoverEnabled: true,
            },
            cacheTimestamp: 1,
          };
        },
      });

    Engine.init(analyticsId, state, keyringState);

    // We can't await RemoteFeatureFlagController:stateChange because can't
    // guarantee it hasn't been called already, so this is the next best option
    while (enableRpcFailoverSpy.mock.calls.length === 0) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 100);
      });
    }
    expect(enableRpcFailoverSpy).toHaveBeenCalled();
  });

  it('disables the RPC failover feature if the walletFrameworkRpcFailoverEnabled feature flag is disabled later', async () => {
    (Date.now as jest.Mock).mockReturnValue(1000000);
    const state = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          walletFrameworkRpcFailoverEnabled: true,
        },
        cacheTimestamp: 0,
      },
    };
    const keyringState = null;
    const analyticsId = '24d24a09-b210-4971-9601-4603c60b23c3';
    const disableRpcFailoverSpy = jest.spyOn(
      NetworkController.prototype,
      'disableRpcFailover',
    );
    ClientConfigApiServiceMock
      // @ts-expect-error We aren't supplying a complete ClientConfigApiService;
      // all we need to override is `fetchRemoteFeatureFlags`
      .mockReturnValue({
        async fetchRemoteFeatureFlags() {
          return {
            remoteFeatureFlags: {
              walletFrameworkRpcFailoverEnabled: false,
            },
            cacheTimestamp: 1,
          };
        },
      });

    Engine.init(analyticsId, state, keyringState);

    // We can't await RemoteFeatureFlagController:stateChange because can't
    // guarantee it hasn't been called already, so this is the next best option
    while (disableRpcFailoverSpy.mock.calls.length === 0) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 100);
      });
    }
    expect(disableRpcFailoverSpy).toHaveBeenCalled();
  });

  describe('getTotalEvmFiatAccountBalance', () => {
    const selectedAddress = '0x9DeE4BF1dE9E3b930E511Db5cEBEbC8d6F855Db0';
    const selectedAccountId = 'test-account-id';
    const chainId: Hex = '0x1';
    const ticker = 'ETH';
    const ethConversionRate = 4000; // $4,000 / ETH
    const ethBalance = 1;
    const stakedEthBalance = 1;

    const state: Partial<EngineState> = {
      AccountsController: {
        ...createMockAccountsControllerState(
          [selectedAddress],
          selectedAddress,
        ),
        internalAccounts: {
          accounts: {
            [selectedAccountId]: createMockInternalAccount(
              selectedAddress,
              'Test Account',
            ),
          },
          selectedAccount: selectedAccountId,
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          [chainId]: {
            [selectedAddress]: { balance: (ethBalance * 1e18).toString() },
          },
        },
      },
      NetworkController: mockNetworkState({
        chainId: '0x1',
        id: '0x1',
        nickname: 'mainnet',
        ticker: 'ETH',
      }),
      CurrencyRateController: {
        currencyRates: {
          [ticker]: {
            conversionRate: ethConversionRate,
            conversionDate: 0,
            usdConversionRate: ethConversionRate,
          },
        },
        currentCurrency: ticker,
      },
    };

    it('calculates when theres no balances', () => {
      const engine = Engine.init(
        TEST_ANALYTICS_ID,
        {
          ...state,
          AccountTrackerController: {
            accountsByChainId: {
              [chainId]: {
                [selectedAddress]: {
                  balance: '0',
                  stakedBalance: '0',
                },
              },
            },
          },
        },
        null,
      );
      const totalFiatBalance = engine.getTotalEvmFiatAccountBalance();
      expect(totalFiatBalance).toStrictEqual({
        ethFiat: 0,
        ethFiat1dAgo: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ticker: 'ETH',
        totalNativeTokenBalance: '0',
      });
    });

    it('calculates when theres only ETH', () => {
      const ethPricePercentChange1d = 5; // up 5%

      const engine = Engine.init(
        TEST_ANALYTICS_ID,
        {
          ...state,
          TokenRatesController: {
            marketData: {
              [chainId]: {
                [zeroAddress()]: {
                  pricePercentChange1d: ethPricePercentChange1d,
                } as Partial<MarketDataDetails> as MarketDataDetails,
              },
            },
          },
        },
        null,
      );

      const totalFiatBalance = engine.getTotalEvmFiatAccountBalance();

      const ethFiat = ethBalance * ethConversionRate;
      expect(totalFiatBalance).toStrictEqual({
        ethFiat,
        ethFiat1dAgo: ethFiat / (1 + ethPricePercentChange1d / 100),
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ticker: 'ETH',
        totalNativeTokenBalance: '1',
      });
    });

    it('calculates when there are ETH and tokens', () => {
      const ethPricePercentChange1d = 5;

      const token1Address = '0x0001' as Hex;
      const token2Address = '0x0002' as Hex;

      const tokens = [
        {
          address: token1Address,
          balance: 1,
          price: 1,
          pricePercentChange1d: -1,
          decimals: 18,
          symbol: 'TEST1',
        },
        {
          address: token2Address,
          balance: 2,
          price: 2,
          pricePercentChange1d: 2,
          decimals: 18,
          symbol: 'TEST2',
        },
      ];

      const engine = Engine.init(
        TEST_ANALYTICS_ID,
        {
          ...state,
          TokensController: {
            allTokens: {
              [chainId]: {
                [selectedAddress]: tokens.map(
                  ({ address, balance, decimals, symbol }) => ({
                    address,
                    balance,
                    decimals,
                    symbol,
                  }),
                ),
              },
            },
            allIgnoredTokens: {},
            allDetectedTokens: {},
          },
          TokenBalancesController: {
            tokenBalances: {
              [selectedAddress as Hex]: {
                [chainId]: {
                  [token1Address]: '0x0de0b6b3a7640000', // 1 token with 18 decimals in hex
                  [token2Address]: '0x1bc16d674ec80000', // 2 tokens with 18 decimals in hex
                },
              },
            },
          },
          TokenRatesController: {
            marketData: {
              [chainId]: {
                [zeroAddress()]: {
                  pricePercentChange1d: ethPricePercentChange1d,
                } as unknown as MarketDataDetails,
                [token1Address]: {
                  price: tokens[0].price,
                  pricePercentChange1d: tokens[0].pricePercentChange1d,
                } as unknown as MarketDataDetails,
                [token2Address]: {
                  price: tokens[1].price,
                  pricePercentChange1d: tokens[1].pricePercentChange1d,
                } as unknown as MarketDataDetails,
              },
            },
          },
        },
        null,
      );

      const totalFiatBalance = engine.getTotalEvmFiatAccountBalance();

      const ethFiat = ethBalance * ethConversionRate;
      const [tokenFiat, tokenFiat1dAgo] = tokens.reduce(
        ([fiat, fiat1d], token) => {
          const value = Number(token.price) * token.balance * ethConversionRate;
          return [
            fiat + value,
            fiat1d + value / (1 + token.pricePercentChange1d / 100),
          ];
        },
        [0, 0],
      );

      expect(totalFiatBalance).toStrictEqual({
        ethFiat,
        ethFiat1dAgo: ethFiat / (1 + ethPricePercentChange1d / 100),
        tokenFiat,
        tokenFiat1dAgo,
        ticker: 'ETH',
        totalNativeTokenBalance: '1',
      });
    });

    it('calculates when there is ETH and staked ETH and tokens', () => {
      const ethPricePercentChange1d = 5;

      const token1Address = '0x0001' as Hex;
      const token2Address = '0x0002' as Hex;

      const tokens = [
        {
          address: token1Address,
          balance: 1,
          price: 1,
          pricePercentChange1d: -1,
          decimals: 18,
          symbol: 'TEST1',
        },
        {
          address: token2Address,
          balance: 2,
          price: 2,
          pricePercentChange1d: 2,
          decimals: 18,
          symbol: 'TEST2',
        },
      ];

      const engine = Engine.init(
        TEST_ANALYTICS_ID,
        {
          ...state,
          AccountTrackerController: {
            accountsByChainId: {
              [chainId]: {
                [selectedAddress]: {
                  balance: (ethBalance * 1e18).toString(),
                  stakedBalance: (stakedEthBalance * 1e18).toString(),
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              [chainId]: {
                [selectedAddress]: tokens.map(
                  ({ address, balance, decimals, symbol }) => ({
                    address,
                    balance,
                    decimals,
                    symbol,
                  }),
                ),
              },
            },
            allIgnoredTokens: {},
            allDetectedTokens: {},
          },
          TokenBalancesController: {
            tokenBalances: {
              [selectedAddress as Hex]: {
                [chainId]: {
                  [token1Address]: '0x0de0b6b3a7640000', // 1 token with 18 decimals in hex
                  [token2Address]: '0x1bc16d674ec80000', // 2 tokens with 18 decimals in hex
                },
              },
            },
          },
          TokenRatesController: {
            marketData: {
              [chainId]: {
                [zeroAddress()]: {
                  pricePercentChange1d: ethPricePercentChange1d,
                } as unknown as MarketDataDetails,
                [token1Address]: {
                  price: tokens[0].price,
                  pricePercentChange1d: tokens[0].pricePercentChange1d,
                } as unknown as MarketDataDetails,
                [token2Address]: {
                  price: tokens[1].price,
                  pricePercentChange1d: tokens[1].pricePercentChange1d,
                } as unknown as MarketDataDetails,
              },
            },
          },
        },
        null,
      );

      const totalFiatBalance = engine.getTotalEvmFiatAccountBalance();
      const ethFiat = (ethBalance + stakedEthBalance) * ethConversionRate;
      const [tokenFiat, tokenFiat1dAgo] = tokens.reduce(
        ([fiat, fiat1d], token) => {
          const value = Number(token.price) * token.balance * ethConversionRate;
          return [
            fiat + value,
            fiat1d + value / (1 + token.pricePercentChange1d / 100),
          ];
        },
        [0, 0],
      );

      expect(totalFiatBalance).toStrictEqual({
        ethFiat,
        ethFiat1dAgo: ethFiat / (1 + ethPricePercentChange1d / 100),
        tokenFiat,
        tokenFiat1dAgo,
        ticker: 'ETH',
        totalNativeTokenBalance: '1',
      });
    });
  });

  it('calls `SnapController:setClientActive` when app state changes to active', () => {
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      },
    );

    const engine = Engine.init(
      TEST_ANALYTICS_ID,
      {
        ...backgroundState,
        KeyringController: {
          ...backgroundState.KeyringController,
          isUnlocked: true,
        },
      },
      null,
    );

    const messengerSpy = jest.spyOn(engine.controllerMessenger, 'call');

    // Simulate app state change to active
    mockAppStateListener('active');

    expect(messengerSpy).toHaveBeenCalledWith(
      'SnapController:setClientActive',
      true,
    );
  });

  it('calls `SnapController:setClientActive` when app state changes to background', () => {
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      },
    );

    const engine = Engine.init(
      TEST_ANALYTICS_ID,
      {
        ...backgroundState,
        KeyringController: {
          ...backgroundState.KeyringController,
          isUnlocked: true,
        },
      },
      null,
    );

    const messengerSpy = jest.spyOn(engine.controllerMessenger, 'call');

    // Simulate app state change to background
    mockAppStateListener('background');

    expect(messengerSpy).toHaveBeenCalledWith(
      'SnapController:setClientActive',
      false,
    );
  });

  it('does not call `SnapController:setClientActive` for other app states', () => {
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      },
    );
    const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);
    const messengerSpy = jest.spyOn(engine.controllerMessenger, 'call');

    // Simulate app state change to inactive
    mockAppStateListener('inactive');

    expect(messengerSpy).not.toHaveBeenCalledWith(
      'SnapController:setClientActive',
      expect.anything(),
    );
  });

  it('does not call `SnapController:setClientActive` when the app is locked', () => {
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_, listener) => {
        mockAppStateListener = listener;
        return { remove: jest.fn() };
      },
    );

    const engine = Engine.init(
      TEST_ANALYTICS_ID,
      {
        ...backgroundState,
        KeyringController: {
          ...backgroundState.KeyringController,
          isUnlocked: false,
        },
      },
      null,
    );

    const messengerSpy = jest.spyOn(engine.controllerMessenger, 'call');

    // Simulate app state change to active
    mockAppStateListener('active');

    expect(messengerSpy).not.toHaveBeenCalledWith(
      'SnapController:setClientActive',
      expect.anything(),
    );
  });

  it('ensures network names are updated for new users', () => {
    // Create a state without NetworkController to simulate first-time setup
    const initState = { ...backgroundState };
    delete (initState as Partial<EngineState>).NetworkController;

    const engine = Engine.init(TEST_ANALYTICS_ID, initState);

    const networkState = engine.context.NetworkController.state;
    const networks = networkState.networkConfigurationsByChainId;

    // Verify that network names have been updated for new users
    expect(networks['0x1'].name).toBe('Ethereum');
    expect(networks['0x2105'].name).toBe('Base');
    expect(networks['0xe708'].name).toBe('Linea');
  });

  it('does not update network names for existing users', () => {
    // Arrange - Create state with existing NetworkController that has original names
    const initState = {
      ...backgroundState,
      NetworkController: mockNetworkState(
        {
          chainId: '0x1',
          nickname: 'Ethereum Mainnet',
        },
        {
          chainId: '0xe708',
          nickname: 'Linea Mainnet', // Original name from API
        },
        {
          chainId: '0x2105',
          nickname: 'Base Mainnet', // Original name from API
        },
      ),
    };

    // Act - Initialize engine with existing NetworkController state
    const engine = Engine.init(TEST_ANALYTICS_ID, initState);
    const networkState = engine.context.NetworkController.state;

    // Assert - Ethereum network name remains unchanged for existing users
    expect(networkState.networkConfigurationsByChainId['0x1'].name).toBe(
      'Ethereum Mainnet',
    );

    // Assert - Linea network name remains unchanged for existing users
    expect(networkState.networkConfigurationsByChainId['0xe708'].name).toBe(
      'Linea Mainnet',
    );

    // Assert - Base network name remains unchanged for existing users
    expect(networkState.networkConfigurationsByChainId['0x2105'].name).toBe(
      'Base Mainnet',
    );
  });

  describe('lookupEnabledNetworks', () => {
    it('should lookup all enabled networks successfully', async () => {
      const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);
      const mockNetworkClientId1 = 'network-client-1';
      const mockNetworkClientId2 = 'network-client-2';

      jest
        .spyOn(engine.context.NetworkEnablementController, 'state', 'get')
        .mockReturnValue({
          enabledNetworkMap: {
            [KnownCaipNamespace.Eip155]: {
              '0x1': true,
              '0x89': true,
              '0x38': false,
            },
          },
        });

      const findNetworkClientIdByChainIdSpy = jest
        .spyOn(engine.context.NetworkController, 'findNetworkClientIdByChainId')
        .mockReturnValueOnce(mockNetworkClientId1)
        .mockReturnValueOnce(mockNetworkClientId2);

      const lookupNetworkSpy = jest
        .spyOn(engine.context.NetworkController, 'lookupNetwork')
        .mockImplementation(() => Promise.resolve());

      await engine.lookupEnabledNetworks();

      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledWith('0x1');
      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledWith('0x89');
      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledTimes(2);

      expect(lookupNetworkSpy).toHaveBeenCalledWith(mockNetworkClientId1);
      expect(lookupNetworkSpy).toHaveBeenCalledWith(mockNetworkClientId2);
      expect(lookupNetworkSpy).toHaveBeenCalledTimes(2);
    });

    it('should only lookup enabled networks and skip disabled ones', async () => {
      const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);
      const mockNetworkClientId1 = 'network-client-1';
      const mockNetworkClientId2 = 'network-client-2';

      const findNetworkClientIdByChainIdSpy = jest
        .spyOn(engine.context.NetworkController, 'findNetworkClientIdByChainId')
        .mockReturnValueOnce(mockNetworkClientId1)
        .mockReturnValueOnce(mockNetworkClientId2);

      jest
        .spyOn(engine.context.NetworkController, 'lookupNetwork')
        .mockImplementation(() => Promise.resolve());

      jest
        .spyOn(engine.context.NetworkEnablementController, 'state', 'get')
        .mockReturnValue({
          enabledNetworkMap: {
            [KnownCaipNamespace.Eip155]: {
              '0x1': true,
              '0x89': true,
              '0x38': false,
            },
          },
        });

      await engine.lookupEnabledNetworks();

      // Should only call for enabled networks (0x1 and 0x89), not for disabled (0x38)
      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledWith('0x1');
      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledWith('0x89');
      expect(findNetworkClientIdByChainIdSpy).not.toHaveBeenCalledWith('0x38');
      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle empty enabled networks list', async () => {
      const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);

      const findNetworkClientIdByChainIdSpy = jest.spyOn(
        engine.context.NetworkController,
        'findNetworkClientIdByChainId',
      );

      const lookupNetworkSpy = jest.spyOn(
        engine.context.NetworkController,
        'lookupNetwork',
      );

      jest
        .spyOn(engine.context.NetworkEnablementController, 'state', 'get')
        .mockReturnValue({
          enabledNetworkMap: {
            [KnownCaipNamespace.Eip155]: {},
          },
        });

      await engine.lookupEnabledNetworks();

      expect(findNetworkClientIdByChainIdSpy).not.toHaveBeenCalled();
      expect(lookupNetworkSpy).not.toHaveBeenCalled();
    });

    it('should handle undefined enabledNetworkMap', async () => {
      const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);

      const findNetworkClientIdByChainIdSpy = jest.spyOn(
        engine.context.NetworkController,
        'findNetworkClientIdByChainId',
      );

      const lookupNetworkSpy = jest.spyOn(
        engine.context.NetworkController,
        'lookupNetwork',
      );

      jest
        .spyOn(engine.context.NetworkEnablementController, 'state', 'get')
        .mockReturnValue({
          enabledNetworkMap: undefined as unknown as Record<
            string,
            Record<string, boolean>
          >,
        });

      await engine.lookupEnabledNetworks();

      expect(findNetworkClientIdByChainIdSpy).not.toHaveBeenCalled();
      expect(lookupNetworkSpy).not.toHaveBeenCalled();
    });

    it('should handle undefined Eip155 namespace in enabledNetworkMap', async () => {
      const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);

      const findNetworkClientIdByChainIdSpy = jest.spyOn(
        engine.context.NetworkController,
        'findNetworkClientIdByChainId',
      );

      const lookupNetworkSpy = jest.spyOn(
        engine.context.NetworkController,
        'lookupNetwork',
      );

      jest
        .spyOn(engine.context.NetworkEnablementController, 'state', 'get')
        .mockReturnValue({
          enabledNetworkMap: {},
        });

      await engine.lookupEnabledNetworks();

      expect(findNetworkClientIdByChainIdSpy).not.toHaveBeenCalled();
      expect(lookupNetworkSpy).not.toHaveBeenCalled();
    });

    it('should handle network lookup failures gracefully', async () => {
      const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);
      const mockNetworkClientId1 = 'network-client-1';
      const mockNetworkClientId2 = 'network-client-2';

      const findNetworkClientIdByChainIdSpy = jest
        .spyOn(engine.context.NetworkController, 'findNetworkClientIdByChainId')
        .mockReturnValueOnce(mockNetworkClientId1)
        .mockReturnValueOnce(mockNetworkClientId2);

      const lookupNetworkSpy = jest
        .spyOn(engine.context.NetworkController, 'lookupNetwork')
        .mockRejectedValueOnce(new Error('Network lookup failed'))
        .mockImplementation(() => Promise.resolve());

      jest
        .spyOn(engine.context.NetworkEnablementController, 'state', 'get')
        .mockReturnValue({
          enabledNetworkMap: {
            [KnownCaipNamespace.Eip155]: {
              '0x1': true,
              '0x89': true,
              '0x38': false,
            },
          },
        });

      await engine.lookupEnabledNetworks();

      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledTimes(2);
      expect(lookupNetworkSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle findNetworkClientIdByChainId returning undefined', async () => {
      const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);

      const findNetworkClientIdByChainIdSpy = jest
        .spyOn(engine.context.NetworkController, 'findNetworkClientIdByChainId')
        .mockReturnValueOnce(undefined as unknown as string)
        .mockReturnValueOnce('network-client-2');

      const lookupNetworkSpy = jest
        .spyOn(engine.context.NetworkController, 'lookupNetwork')
        .mockImplementation(() => Promise.resolve());

      jest
        .spyOn(engine.context.NetworkEnablementController, 'state', 'get')
        .mockReturnValue({
          enabledNetworkMap: {
            [KnownCaipNamespace.Eip155]: {
              '0x1': true,
              '0x89': true,
              '0x38': false,
            },
          },
        });

      await engine.lookupEnabledNetworks();

      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledTimes(2);
      expect(lookupNetworkSpy).toHaveBeenCalledWith('network-client-2');
      expect(lookupNetworkSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const engine = Engine.init(TEST_ANALYTICS_ID, backgroundState);
      const mockNetworkClientId1 = 'network-client-1';
      const mockNetworkClientId2 = 'network-client-2';
      const mockNetworkClientId3 = 'network-client-3';

      const findNetworkClientIdByChainIdSpy = jest
        .spyOn(engine.context.NetworkController, 'findNetworkClientIdByChainId')
        .mockReturnValueOnce(mockNetworkClientId1)
        .mockReturnValueOnce(mockNetworkClientId2)
        .mockReturnValueOnce(mockNetworkClientId3);

      const lookupNetworkSpy = jest
        .spyOn(engine.context.NetworkController, 'lookupNetwork')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Network 2 failed'))
        .mockImplementation(() => Promise.resolve());

      jest
        .spyOn(engine.context.NetworkEnablementController, 'state', 'get')
        .mockReturnValue({
          enabledNetworkMap: {
            [KnownCaipNamespace.Eip155]: {
              '0x1': true,
              '0x89': true,
              '0xa': true,
            },
          },
        });

      await engine.lookupEnabledNetworks();

      expect(findNetworkClientIdByChainIdSpy).toHaveBeenCalledTimes(3);
      expect(lookupNetworkSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Engine.state', () => {
    it('throws error when accessing state before Engine exists', () => {
      expect(() => Engine.state).toThrow('Engine does not exist');
    });

    it('returns state from all controllers with state', () => {
      Engine.init(TEST_ANALYTICS_ID, {});
      const controllersWithState = Object.entries(Engine.context)
        .filter(
          ([_, controller]) =>
            'state' in controller &&
            Boolean(controller.state) &&
            !isEmpty(controller.state),
        )
        .map(([controllerName]) => controllerName);

      const state = Engine.state;

      const sortedControllersInState = Object.keys(state).sort();
      const sortedExpectedControllers = controllersWithState.sort();
      expect(sortedControllersInState).toEqual(sortedExpectedControllers);
    });
  });
});
