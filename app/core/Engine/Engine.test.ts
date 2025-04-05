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
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { CaveatTypes } from '../Permissions/constants';
import { PermissionKeys } from '../Permissions/specifications';
import {
  CaveatSpecificationConstraint,
  ExtractPermission,
  PermissionSpecificationConstraint,
  SubjectPermissions,
} from '@metamask/permission-controller';
import { pick } from 'lodash';

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

  describe('getCaip25PermissionFromLegacyPermissions', () => {
    const engine = Engine.init({});

    it('returns valid CAIP-25 permissions', async () => {
      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {},
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for eth_accounts and permittedChains when only eth_accounts is specified in params and origin is not snapId', async () => {
      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x0000000000000000000000000000000000000001'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [
                        'wallet:eip155:0x0000000000000000000000000000000000000001',
                      ],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsControllerr for eth_accounts and permittedChains when only permittedChains is specified in params and origin is not snapId', async () => {
      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: ['0x64'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [],
                    },
                    'eip155:100': {
                      accounts: [],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for eth_accounts and permittedChains when both are specified in params and origin is not snapId', async () => {
      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x0000000000000000000000000000000000000001'],
              },
            ],
          },
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: ['0x64'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [
                        'wallet:eip155:0x0000000000000000000000000000000000000001',
                      ],
                    },
                    'eip155:100': {
                      accounts: [
                        'eip155:100:0x0000000000000000000000000000000000000001',
                      ],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for only eth_accounts when only eth_accounts is specified in params and origin is snapId', async () => {
      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        'npm:snap',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x0000000000000000000000000000000000000001'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [
                        'wallet:eip155:0x0000000000000000000000000000000000000001',
                      ],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for only eth_accounts when only permittedChains is specified in params and origin is snapId', async () => {
      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        'npm:snap',
        {
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: ['0x64'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for only eth_accounts when both eth_accounts and permittedChains are specified in params and origin is snapId', async () => {
      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        'npm:snap',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x0000000000000000000000000000000000000001'],
              },
            ],
          },
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: ['0x64'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [
                        'wallet:eip155:0x0000000000000000000000000000000000000001',
                      ],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns CAIP-25 approval with accounts and chainIds specified from `eth_accounts` and `endowment:permittedChains` permissions caveats, and isMultichainOrigin: false if origin is not snapId', async () => {
      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: 'restrictReturnedAccounts',
                value: ['0xdeadbeef'],
              },
            ],
          },
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: 'restrictNetworkSwitching',
                value: ['0x1', '0x5'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: ['wallet:eip155:0xdeadbeef'],
                    },
                    'eip155:1': {
                      accounts: ['eip155:1:0xdeadbeef'],
                    },
                    'eip155:5': {
                      accounts: ['eip155:5:0xdeadbeef'],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns CAIP-25 approval with approved accounts for the `wallet:eip155` scope (and no approved chainIds) with isMultichainOrigin: false if origin is snapId', async () => {
      const origin = 'npm:snap';

      const permissions = await engine.getCaip25PermissionFromLegacyPermissions(
        origin,
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: 'restrictReturnedAccounts',
                value: ['0xdeadbeef'],
              },
            ],
          },
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: 'restrictNetworkSwitching',
                value: ['0x1', '0x5'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: ['wallet:eip155:0xdeadbeef'],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });
  });

  describe('requestPermittedChainsPermissionIncremental', () => {
    const engine = Engine.init({});

    it('throws if the origin is snapId', async () => {
      await expect(() =>
        engine.requestPermittedChainsPermissionIncremental({
          origin: 'npm:snap',
          chainId: '0x1',
          autoApprove: false,
        }),
      ).rejects.toThrow(
        new Error(
          'Cannot request permittedChains permission for Snaps with origin "npm:snap"',
        ),
      );
    });

    it('requests permittedChains approval if autoApprove: false', async () => {
      const subjectPermissions: Partial<
        SubjectPermissions<
          ExtractPermission<
            PermissionSpecificationConstraint,
            CaveatSpecificationConstraint
          >
        >
      > = {
        [Caip25EndowmentPermissionName]: {
          id: 'id',
          date: 1,
          invoker: 'origin',
          parentCapability: PermissionKeys.permittedChains,
          caveats: [
            {
              type: Caip25CaveatType,
              value: {
                requiredScopes: {},
                optionalScopes: { 'eip155:1': { accounts: [] } },
                isMultichainOrigin: false,
                sessionProperties: {},
              },
            },
          ],
        },
      };

      const expectedCaip25Permission = {
        [Caip25EndowmentPermissionName]: pick(
          subjectPermissions[Caip25EndowmentPermissionName],
          'caveats',
        ),
      };

      jest
        .spyOn(
          engine.context.PermissionController,
          'requestPermissionsIncremental',
        )
        .mockResolvedValue([
          subjectPermissions,
          { id: 'id', origin: 'origin' },
        ]);

      await engine.requestPermittedChainsPermissionIncremental({
        origin: 'test.com',
        chainId: '0x1',
        autoApprove: false,
      });

      expect(
        engine.context.PermissionController.requestPermissionsIncremental,
      ).toHaveBeenCalledWith({ origin: 'test.com' }, expectedCaip25Permission);
    });

    it('throws if permittedChains approval is rejected', async () => {
      jest
        .spyOn(
          engine.context.PermissionController,
          'requestPermissionsIncremental',
        )
        .mockRejectedValue(new Error('approval rejected'));

      await expect(() =>
        engine.requestPermittedChainsPermissionIncremental({
          origin: 'test.com',
          chainId: '0x1',
          autoApprove: false,
        }),
      ).rejects.toThrow(new Error('approval rejected'));
    });

    it('grants permittedChains approval if autoApprove: true', async () => {
      const subjectPermissions: Partial<
        SubjectPermissions<
          ExtractPermission<
            PermissionSpecificationConstraint,
            CaveatSpecificationConstraint
          >
        >
      > = {
        [Caip25EndowmentPermissionName]: {
          id: 'id',
          date: 1,
          invoker: 'origin',
          parentCapability: PermissionKeys.permittedChains,
          caveats: [
            {
              type: Caip25CaveatType,
              value: {
                requiredScopes: {},
                optionalScopes: { 'eip155:1': { accounts: [] } },
                isMultichainOrigin: false,
                sessionProperties: {},
              },
            },
          ],
        },
      };

      const expectedCaip25Permission = {
        [Caip25EndowmentPermissionName]: pick(
          subjectPermissions[Caip25EndowmentPermissionName],
          'caveats',
        ),
      };

      jest
        .spyOn(
          engine.context.PermissionController,
          'grantPermissionsIncremental',
        )
        .mockReturnValue(subjectPermissions);

      await engine.requestPermittedChainsPermissionIncremental({
        origin: 'test.com',
        chainId: '0x1',
        autoApprove: true,
      });

      expect(
        engine.context.PermissionController.grantPermissionsIncremental,
      ).toHaveBeenCalledWith({
        subject: { origin: 'test.com' },
        approvedPermissions: expectedCaip25Permission,
      });
    });

    it('throws if autoApprove: true and granting permittedChains throws', async () => {
      jest
        .spyOn(
          engine.context.PermissionController,
          'grantPermissionsIncremental',
        )
        .mockImplementation(() => {
          throw new Error('Invalid merged permissions for subject "test.com"');
        });

      await expect(() =>
        engine.requestPermittedChainsPermissionIncremental({
          origin: 'test.com',
          chainId: '0x1',
          autoApprove: true,
        }),
      ).rejects.toThrow(
        new Error('Invalid merged permissions for subject "test.com"'),
      );
    });
  });
});
