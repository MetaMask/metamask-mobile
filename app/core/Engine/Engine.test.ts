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

jest.mock('../BackupVault', () => ({
  backupVault: jest.fn().mockResolvedValue({ success: true, vault: 'vault' }),
}));
jest.unmock('./Engine');
jest.mock('../../store', () => ({
  store: { getState: jest.fn(() => ({ engine: {} })) },
}));
jest.mock('../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn().mockReturnValue(false),
  selectSmartTransactionsEnabled: jest.fn().mockReturnValue(false),
  selectPendingSmartTransactionsBySender: jest.fn().mockReturnValue([]),
}));
jest.mock('../../selectors/settings', () => ({
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

describe('Engine', () => {
  // Create a shared mock account for tests
  const validAddress = MOCK_ADDRESS_1;
  const mockAccount = createMockInternalAccount(validAddress, 'Test Account');

  afterEach(() => {
    jest.restoreAllMocks();
    (backupVault as jest.Mock).mockReset();
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
        keyringsMetadata: [],
      } as KeyringControllerState,
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
        keyringsMetadata: [],
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
    expect(initialBackgroundState).toStrictEqual(backgroundState);
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

  describe('getTotalFiatAccountBalance', () => {
    let engine: EngineClass;
    afterEach(() => engine?.destroyEngineInstance());

    const selectedAddress = '0x9DeE4BF1dE9E3b930E511Db5cEBEbC8d6F855Db0';
    const chainId: Hex = '0x1';
    const ticker = 'ETH';
    const ethConversionRate = 4000; // $4,000 / ETH
    const ethBalance = 1;
    const stakedEthBalance = 1;

    const state: Partial<EngineState> = {
      AccountsController: createMockAccountsControllerState(
        [selectedAddress],
        selectedAddress,
      ),
      AccountTrackerController: {
        accountsByChainId: {
          [chainId]: {
            [selectedAddress]: { balance: (ethBalance * 1e18).toString() },
          },
        },
        accounts: {
          [selectedAddress]: { balance: (ethBalance * 1e18).toString() },
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
      engine = Engine.init(state);
      const totalFiatBalance = engine.getTotalFiatAccountBalance();
      expect(totalFiatBalance).toStrictEqual({
        ethFiat: 0,
        ethFiat1dAgo: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
      });
    });

    it('calculates when theres only ETH', () => {
      const ethPricePercentChange1d = 5; // up 5%

      engine = Engine.init({
        ...state,
        TokenRatesController: {
          marketData: {
            [chainId]: {
              [zeroAddress()]: {
                pricePercentChange1d: ethPricePercentChange1d,
              } as MarketDataDetails,
            },
          },
        },
      });

      const totalFiatBalance = engine.getTotalFiatAccountBalance();

      const ethFiat = ethBalance * ethConversionRate;
      expect(totalFiatBalance).toStrictEqual({
        ethFiat,
        ethFiat1dAgo: ethFiat / (1 + ethPricePercentChange1d / 100),
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
      });
    });

    it('calculates when there are ETH and tokens', () => {
      const ethPricePercentChange1d = 5;

      const tokens = [
        {
          address: '0x001',
          balance: 1,
          price: '1',
          pricePercentChange1d: -1,
        },
        {
          address: '0x002',
          balance: 2,
          price: '2',
          pricePercentChange1d: 2,
        },
      ];

      engine = Engine.init({
        ...state,
        TokensController: {
          tokens: tokens.map((token) => ({
            address: token.address,
            balance: token.balance,
            decimals: 18,
            symbol: 'TEST',
          })),
          ignoredTokens: [],
          detectedTokens: [],
          allTokens: {},
          allIgnoredTokens: {},
          allDetectedTokens: {},
        },
        TokenRatesController: {
          marketData: {
            [chainId]: {
              [zeroAddress()]: {
                pricePercentChange1d: ethPricePercentChange1d,
              },
              ...tokens.reduce(
                (acc, token) => ({
                  ...acc,
                  [token.address]: {
                    price: token.price,
                    pricePercentChange1d: token.pricePercentChange1d,
                  },
                }),
                {},
              ),
            },
          },
        },
      });

      const totalFiatBalance = engine.getTotalFiatAccountBalance();

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
      });
    });

    it('calculates when there is ETH and staked ETH and tokens', () => {
      const ethPricePercentChange1d = 5;

      const tokens = [
        {
          address: '0x001',
          balance: 1,
          price: '1',
          pricePercentChange1d: -1,
        },
        {
          address: '0x002',
          balance: 2,
          price: '2',
          pricePercentChange1d: 2,
        },
      ];

      engine = Engine.init({
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
          accounts: {
            [selectedAddress]: {
              balance: (ethBalance * 1e18).toString(),
              stakedBalance: (stakedEthBalance * 1e18).toString(),
            },
          },
        },
        TokensController: {
          tokens: tokens.map((token) => ({
            address: token.address,
            balance: token.balance,
            decimals: 18,
            symbol: 'TEST',
          })),
          ignoredTokens: [],
          detectedTokens: [],
          allTokens: {},
          allIgnoredTokens: {},
          allDetectedTokens: {},
        },
        TokenRatesController: {
          marketData: {
            [chainId]: {
              [zeroAddress()]: {
                pricePercentChange1d: ethPricePercentChange1d,
              },
              ...tokens.reduce(
                (acc, token) => ({
                  ...acc,
                  [token.address]: {
                    price: token.price,
                    pricePercentChange1d: token.pricePercentChange1d,
                  },
                }),
                {},
              ),
            },
          },
        },
      });

      const totalFiatBalance = engine.getTotalFiatAccountBalance();
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
      });
    });
  });
});
