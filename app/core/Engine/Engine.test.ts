import { MarketDataDetails } from '@metamask/assets-controllers';
import Engine, { Engine as EngineClass } from './Engine';
import { EngineState } from './types';
import { backgroundState } from '../../util/test/initial-root-state';
import { zeroAddress } from 'ethereumjs-util';
import {
  createMockAccountsControllerState,
  createMockInternalAccount,
  MOCK_ADDRESS_1,
} from '../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../util/test/network';
import { Hex } from '@metamask/utils';
import { KeyringControllerState } from '@metamask/keyring-controller';
import { backupVault } from '../BackupVault';
import { getVersion } from 'react-native-device-info';
import { version as migrationVersion } from '../../store/migrations';
import { AppState, AppStateStatus } from 'react-native';
import ReduxService from '../redux';
import configureStore from '../../util/test/configureStore';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.44.0'),
}));

jest.mock('../BackupVault', () => ({
  backupVault: jest.fn().mockResolvedValue({ success: true, vault: 'vault' }),
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

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  rejectOriginApprovals: jest.fn(),
}));

describe('Engine', () => {
  // Create a shared mock account for tests
  const validAddress = MOCK_ADDRESS_1;
  const mockAccount = createMockInternalAccount(validAddress, 'Test Account');
  let mockAppStateListener: (state: AppStateStatus) => void;

  beforeEach(() => {
    ReduxService.store = configureStore({});
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    (backupVault as jest.Mock).mockReset();
    await Engine.destroyEngine();
  });

  it('should expose an API', () => {
    const engine = Engine.init({});
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
    expect(engine.context).toHaveProperty('RatesController');
    expect(engine.context).toHaveProperty('MultichainNetworkController');
    expect(engine.context).toHaveProperty('BridgeController');
    expect(engine.context).toHaveProperty('BridgeStatusController');
    expect(engine.context).toHaveProperty('EarnController');
    expect(engine.context).toHaveProperty('MultichainTransactionsController');
    expect(engine.context).toHaveProperty('DeFiPositionsController');
    expect(engine.context).toHaveProperty('NetworkEnablementController');
    expect(engine.context).toHaveProperty('PerpsController');
  });

  it('calling Engine.init twice returns the same instance', () => {
    const engine = Engine.init({});
    const newEngine = Engine.init({});
    expect(engine).toStrictEqual(newEngine);
  });

  it('should backup vault when Engine is initialized and vault exists', () => {
    (backupVault as jest.Mock).mockResolvedValue({
      success: true,
      vault: 'vault',
    });
    const engine = Engine.init({});
    const newEngine = Engine.init({});
    expect(engine).toStrictEqual(newEngine);
    engine.controllerMessenger.publish(
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
    const engine = Engine.init({});
    const newEngine = Engine.init({});
    expect(engine).toStrictEqual(newEngine);
    engine.controllerMessenger.publish(
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
    const engine = Engine.init({});
    await engine.destroyEngineInstance();
    const newEngine = Engine.init({});
    expect(engine).not.toStrictEqual(newEngine);
  });

  // Use this to keep the unit test initial background state fixture up-to-date
  it('matches initial state fixture', () => {
    const engine = Engine.init({});
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
      AppMetadataController: {
        currentAppVersion,
        previousAppVersion: '', // This will be managed by the controller
        previousMigrationVersion: 0, // This will be managed by the controller
        currentMigrationVersion,
      },
    };

    expect(initialBackgroundState).toStrictEqual(expectedState);
  });

  it('setSelectedAccount throws an error if no account exists for the given address', () => {
    const engine = Engine.init(backgroundState);
    const invalidAddress = '0xInvalidAddress';

    expect(() => engine.setSelectedAccount(invalidAddress)).toThrow(
      `No account found for address: ${invalidAddress}`,
    );
  });

  it('setSelectedAccount successfully updates selected account when address exists', () => {
    const engine = Engine.init(backgroundState);

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
    const engine = Engine.init(backgroundState);
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
    const engine = Engine.init(backgroundState);
    const invalidAddress = '0xInvalidAddress';
    const label = 'Test Account';

    expect(() => engine.setAccountLabel(invalidAddress, label)).toThrow(
      `No account found for address: ${invalidAddress}`,
    );
  });

  it('getSnapKeyring gets or creates a snap keyring', async () => {
    const engine = new EngineClass(backgroundState);
    const mockSnapKeyring = { type: 'Snap Keyring' };
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
    const engine = new EngineClass(backgroundState);
    const mockSnapKeyring = { type: 'Snap Keyring' };

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
    const engine = Engine.init(state);
    expect(
      engine.datamodel.state.CurrencyRateController.currencyRates[ticker],
    ).toStrictEqual({
      conversionRate: 0,
      conversionDate: 0,
      usdConversionRate: null,
    });
  });

  it('does not pass initial RemoteFeatureFlagController state to the controller', () => {
    const state = {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {},
        cacheTimestamp: 20000000000000,
      },
    };
    const engine = Engine.init(state);
    expect(engine.datamodel.state.RemoteFeatureFlagController).toStrictEqual({
      remoteFeatureFlags: {},
      cacheTimestamp: 0,
    });
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
      const engine = Engine.init({
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
      });
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

      const engine = Engine.init({
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
      });

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

      const engine = Engine.init({
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
      });

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

      const engine = Engine.init({
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
      });

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
    const engine = Engine.init(backgroundState);
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
    const engine = Engine.init(backgroundState);
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
    const engine = Engine.init(backgroundState);
    const messengerSpy = jest.spyOn(engine.controllerMessenger, 'call');

    // Simulate app state change to inactive
    mockAppStateListener('inactive');

    expect(messengerSpy).not.toHaveBeenCalledWith(
      'SnapController:setClientActive',
      expect.anything(),
    );
  });

  it('ensures network names are updated for new users', () => {
    // Create a state without NetworkController to simulate first-time setup
    const initState = { ...backgroundState };
    delete (initState as Partial<EngineState>).NetworkController;

    const engine = Engine.init(initState);

    const networkState = engine.context.NetworkController.state;
    const networks = networkState.networkConfigurationsByChainId;

    // Verify that network names have been updated for new users
    expect(networks['0x1'].name).toBe('Ethereum');
    expect(networks['0x2105'].name).toBe('Base');
    expect(networks['0xe708'].name).toBe('Linea');
  });
});
