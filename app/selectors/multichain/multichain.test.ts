import { RootState } from '../../reducers';
import {
  selectMultichainDefaultToken,
  selectMultichainIsMainnet,
  selectMultichainSelectedAccountCachedBalance,
  selectMultichainShouldShowFiat,
  selectMultichainBalances,
  selectMultichainTransactions,
  selectSelectedAccountMultichainNetworkAggregatedBalance,
  selectNonEvmTransactions,
  selectMultichainHistoricalPrices,
  makeSelectNonEvmAssetById,
  selectMultichainTokenListForAccountsAnyChain,
} from './multichain';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
  MOCK_ACCOUNT_BIP122_P2WPKH,
  MOCK_SOLANA_ACCOUNT,
} from '../../util/test/accountsControllerTestUtils';
import { CaipAssetType, Hex } from '@metamask/utils';
import { selectAccountBalanceByChainId } from '../accountTrackerController';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { selectIsEvmNetworkSelected } from '../multichainNetworkController';
import {
  BtcScope,
  SolAccountType,
  SolScope,
  TrxScope,
} from '@metamask/keyring-api';
import { AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS } from '@metamask/multichain-network-controller';

const BTC_NATIVE_CURRENCY =
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[BtcScope.Mainnet].nativeCurrency;
const BTC_TESTNET_NATIVE_CURRENCY =
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[BtcScope.Testnet].nativeCurrency;
const SOL_NATIVE_CURRENCY =
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[SolScope.Mainnet].nativeCurrency;

interface TestTransaction {
  id: string;
  timestamp?: number;
}

function getEvmState(
  chainId?: Hex,
  mockEvmConversionRate: number = 1500,
  showFiatOnTestnets: boolean = true,
): RootState {
  const {
    MOCK_ACCOUNTS_CONTROLLER_STATE: mockEvmAccountsState,
    MOCK_ACCOUNT_BIP122_P2WPKH: mockBtcAccount,
    MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET: mockBtcTestnetAccount,
  } = jest.requireActual('../../util/test/accountsControllerTestUtils');

  const { mockNetworkState } = jest.requireActual('../../util/test/network');

  const currentChainId = chainId ?? CHAIN_IDS.MAINNET;
  const state = {
    engine: {
      backgroundState: {
        NetworkController: {
          ...mockNetworkState({
            id: 'mainnet',
            nickname: 'Ethereum Mainnet',
            ticker: 'ETH',
            chainId: currentChainId,
          }),
        },
        KeyringController: {
          keyrings: [],
          isUnlocked: true,
          keyringTypes: {},
          vault: '',
          encryptionKey: '',
          encryptionSalt: '',
          memStore: {
            isUnlocked: true,
          },
        },
        AccountsController: mockEvmAccountsState,
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              [toChecksumHexAddress(
                mockEvmAccountsState.internalAccounts.accounts[
                  mockEvmAccountsState.internalAccounts.selectedAccount
                ].address,
              )]: {
                balance: '3',
              },
            },
          },
        },
        MultichainAssetsController: {},
        MultichainAssetsRatesController: {},
        MultichainBalancesController: {
          balances: {
            [mockBtcAccount.id]: {
              [BTC_NATIVE_CURRENCY]: {
                amount: '1.00000000',
                unit: 'BTC',
              },
            },
            [mockBtcTestnetAccount.id]: {
              [BTC_TESTNET_NATIVE_CURRENCY]: {
                amount: '2.00000000',
                unit: 'tBTC',
              },
            },
          },
        },
        CurrencyRateController: {
          conversionRate: mockEvmConversionRate,
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionRate: mockEvmConversionRate,
              conversionDate: new Date().getTime(),
              usdConversionRate: mockEvmConversionRate,
            },
          },
          nativeCurrency: 'ETH',
          pendingCurrentCurrency: null,
          pendingNativeCurrency: null,
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: SolScope.Mainnet,

          multichainNetworkConfigurationsByChainId: {},
        },
        MultichainTransactionsController: {
          nonEvmTransactions: {
            [MOCK_ACCOUNT_BIP122_P2WPKH.id]: {
              transactions: [],
              next: null,
              lastUpdated: 0,
            },
          },
        },
      },
    },
    settings: {
      showFiatOnTestnets,
    },
  };
  return state as unknown as RootState;
}

function getNonEvmState(
  account?: InternalAccount,
  mockBtcRate?: string,
  showFiatOnTestnets: boolean = true,
  isSolanaTestnetEnabled: boolean = false,
): RootState {
  const {
    MOCK_ACCOUNT_BIP122_P2WPKH: mockBtcAccount,
    MOCK_MULTICHAIN_NON_EVM_ACCOUNTS: mockNonEvmAccountsArray,
  } = jest.requireActual('../../util/test/accountsControllerTestUtils');

  const selectedAccount = account ?? mockBtcAccount;

  const selectedNonEvmChainId =
    selectedAccount.type === SolAccountType.DataAccount
      ? SolScope.Mainnet
      : selectedAccount.scopes[0] === BtcScope.Testnet
        ? BtcScope.Testnet
        : BtcScope.Mainnet;

  const state = {
    ...getEvmState(undefined, 1500, showFiatOnTestnets),
    engine: {
      backgroundState: {
        ...getEvmState().engine.backgroundState,
        KeyringController: {
          keyrings: [],
          isUnlocked: true,
          keyringTypes: {},
          vault: '',
          encryptionKey: '',
          encryptionSalt: '',
          memStore: {
            isUnlocked: true,
          },
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            solanaTestnetsEnabled: isSolanaTestnetEnabled,
          },
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: selectedAccount.id,
            accounts: mockNonEvmAccountsArray,
          },
        },
        MultichainNetworkController: {
          isEvmSelected: false,
          selectedMultichainNetworkChainId: selectedNonEvmChainId,

          multichainNetworkConfigurationsByChainId: {
            [SolScope.Mainnet]: {
              chainId: SolScope.Mainnet,
              name: 'Solana',
              nativeCurrency: 'SOL',
              isEvm: false,
              blockExplorers: {
                urls: ['https://solscan.io'],
                defaultIndex: 0,
              },
              ticker: 'SOL',
              decimals: 9,
            },
            [BtcScope.Mainnet]: {
              chainId: BtcScope.Mainnet,
              name: 'Bitcoin',
              nativeCurrency: 'BTC',
              isEvm: false,
              blockExplorers: {
                urls: [],
                defaultIndex: 0,
              },
              ticker: 'BTC',
              decimals: 8,
            },
            [BtcScope.Testnet]: {
              chainId: BtcScope.Testnet,
              name: 'Bitcoin Testnet',
              nativeCurrency: 'BTC',
              isEvm: false,
              blockExplorers: {
                urls: [],
                defaultIndex: 0,
              },
            },
          },
        },
        RatesController: mockBtcRate
          ? {
              rates: {
                btc: {
                  conversionRate: mockBtcRate,
                  conversionDate: new Date().getTime(),
                  usdConversionRate: mockBtcRate,
                },
              },
              fiatCurrency: 'usd',
              cryptocurrencies: ['btc'],
            }
          : {
              rates: {},
              fiatCurrency: 'usd',
              cryptocurrencies: [],
            },
      },
    },
  };
  return state as unknown as RootState;
}

describe('MultichainNonEvm Selectors', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  describe('selectMultichainIsEvm', () => {
    it('returns true if selected account is EVM compatible', () => {
      const state = getEvmState();

      expect(selectIsEvmNetworkSelected(state)).toBe(true);
    });

    it('returns false if selected account is not EVM compatible', () => {
      const state = getNonEvmState();
      expect(selectIsEvmNetworkSelected(state)).toBe(false);
    });

    it('returns false if selected account is Solana', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);
      expect(selectIsEvmNetworkSelected(state)).toBe(false);
    });
  });
  describe('selectMultichainIsMainnet', () => {
    it('returns true if account is EVM (mainnet)', () => {
      const state = getEvmState();

      expect(selectMultichainIsMainnet(state)).toBe(true);
    });

    it('returns false if account is EVM (testnet)', () => {
      const state = getEvmState(CHAIN_IDS.SEPOLIA);
      expect(selectMultichainIsMainnet(state)).toBe(false);
    });

    it('returns true if account is Solana mainnet', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);
      expect(selectMultichainIsMainnet(state)).toBe(true);
    });

    it.each([
      { isMainnet: true, account: MOCK_ACCOUNT_BIP122_P2WPKH },
      { isMainnet: false, account: MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET },
      { isMainnet: true, account: MOCK_SOLANA_ACCOUNT },
    ])(
      'returns $isMainnet if non-EVM account address "$account.address" is compatible with mainnet',
      ({
        isMainnet,
        account,
      }: {
        isMainnet: boolean;
        account: InternalAccount;
      }) => {
        const state = getNonEvmState(account);
        expect(selectMultichainIsMainnet(state)).toBe(isMainnet);
      },
    );
  });
  describe('selectMultichainShouldShowFiat', () => {
    it('returns true if account is EVM and the network is mainnet', () => {
      const state = getEvmState();
      expect(selectMultichainShouldShowFiat(state)).toBe(true);
    });

    it('returns true if account is EVM on testnet and showFiatInTestnets is true', () => {
      const state = getEvmState(CHAIN_IDS.SEPOLIA, 1500, true);
      expect(selectMultichainShouldShowFiat(state)).toBe(true);
    });

    it('returns false if account is EVM on testnet and showFiatInTestnets is false', () => {
      const state = getEvmState(CHAIN_IDS.SEPOLIA, 1500, false);
      expect(selectMultichainShouldShowFiat(state)).toBe(false);
    });

    it('returns true if account is non-EVM and the network is mainnet', () => {
      const state = getNonEvmState();
      expect(selectMultichainShouldShowFiat(state)).toBe(true);
    });

    it('returns true if account is non-EVM on testnet and showFiatInTestnets is true', () => {
      const state = getNonEvmState(
        MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
        undefined,
        true,
      );
      expect(selectMultichainShouldShowFiat(state)).toBe(true);
    });

    it('returns false if account is non-EVM on testnet and showFiatInTestnets is false', () => {
      const state = getNonEvmState(
        MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
        undefined,
        false,
      );
      expect(selectMultichainShouldShowFiat(state)).toBe(false);
    });

    it('returns true if Solana account is on mainnet and showFiatInTestnets is false', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT, undefined, false);
      expect(selectMultichainShouldShowFiat(state)).toBe(true);
    });
  });
  describe('selectMultichainSelectedAccountCachedBalance', () => {
    it('returns cached balance if account is EVM', () => {
      const state = getEvmState();
      expect(selectMultichainSelectedAccountCachedBalance(state)).toBe(
        selectAccountBalanceByChainId(state)?.balance,
      );
    });

    it.each([
      {
        network: 'Bitcoin',
        account: MOCK_ACCOUNT_BIP122_P2WPKH,
        asset: BTC_NATIVE_CURRENCY,
      },
      {
        network: 'Bitcoin Testnet',
        account: MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
        asset: BTC_TESTNET_NATIVE_CURRENCY,
      },
    ])(
      'returns cached balance if account is non-EVM: $network',
      ({ account, asset }: { account: InternalAccount; asset: string }) => {
        const state = getNonEvmState(account);
        const balance =
          state.engine.backgroundState.MultichainBalancesController.balances[
            account.id
          ][asset].amount;

        state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
          account.id;
        expect(selectMultichainSelectedAccountCachedBalance(state)).toBe(
          balance,
        );
      },
    );

    it('returns cached balance if account is Solana', () => {
      const mockSolBalance = '5.5';
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);
      state.engine.backgroundState.MultichainBalancesController.balances = {
        [MOCK_SOLANA_ACCOUNT.id]: {
          [SOL_NATIVE_CURRENCY]: {
            amount: mockSolBalance,
            unit: 'SOL',
          },
        },
      };

      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        MOCK_SOLANA_ACCOUNT.id;
      expect(selectMultichainSelectedAccountCachedBalance(state)).toBe(
        mockSolBalance,
      );
    });
  });
  describe('selectMultichainDefaultToken', () => {
    it('returns ETH if account is EVM', () => {
      const state = getEvmState();

      expect(selectMultichainDefaultToken(state)).toEqual({
        symbol: 'ETH',
      });
    });

    it('returns true if account is non-EVM (bip122:*)', () => {
      const state = getNonEvmState();
      expect(selectMultichainDefaultToken(state)).toEqual({
        symbol: 'BTC',
      });
    });

    it('returns SOL if account is Solana', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);
      expect(selectMultichainDefaultToken(state)).toEqual({
        symbol: 'SOL',
      });
    });
  });

  describe('selectMultichainBalances and selectMultichainCoinRates', () => {
    it('selectMultichainBalances returns balances from the MultichainBalancesController state', () => {
      const state = getEvmState();
      const mockBalances = {
        'account-1': {
          [BTC_NATIVE_CURRENCY]: { amount: '10', unit: 'BTC' },
        },
      };
      state.engine.backgroundState.MultichainBalancesController.balances =
        mockBalances;
      expect(selectMultichainBalances(state)).toEqual(mockBalances);
    });
  });

  describe('selectMultichainTransactions', () => {
    it('returns non-EVM transactions from the MultichainTransactionsController state', () => {
      const state = getEvmState();

      const mockTransactions = {
        [MOCK_ACCOUNT_BIP122_P2WPKH.id]: {
          transactions: [
            {
              id: 'some-id',
              timestamp: 1733736433,
              chain: BtcScope.Mainnet,
              status: 'confirmed' as const,
              type: 'send' as const,
              account: MOCK_ACCOUNT_BIP122_P2WPKH.id,
              from: [],
              to: [],
              fees: [],
              events: [],
            },
          ],
          next: null,
          lastUpdated: expect.any(Number),
        },
      };

      state.engine.backgroundState.MultichainTransactionsController = {
        nonEvmTransactions: mockTransactions,
      } as unknown as typeof state.engine.backgroundState.MultichainTransactionsController;

      expect(selectMultichainTransactions(state)).toEqual(mockTransactions);
    });

    it('returns empty object when no transactions exist', () => {
      const state = getEvmState();

      state.engine.backgroundState.MultichainTransactionsController = {
        nonEvmTransactions: {},
      } as unknown as typeof state.engine.backgroundState.MultichainTransactionsController;

      expect(selectMultichainTransactions(state)).toEqual({});
    });
  });

  describe('selectMultichainBalances and selectMultichainCoinRates', () => {
    it('selectMultichainBalances returns balances from the MultichainBalancesController state', () => {
      const state = getEvmState();
      const mockBalances = {
        'account-1': {
          [BTC_NATIVE_CURRENCY]: { amount: '10', unit: 'BTC' },
        },
      };
      state.engine.backgroundState.MultichainBalancesController.balances =
        mockBalances;
      expect(selectMultichainBalances(state)).toEqual(mockBalances);
    });
  });

  describe('selectMultichainNetworkAggregatedBalance', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns aggregated balances in native and fiat', () => {
      const mockState = getNonEvmState(MOCK_SOLANA_ACCOUNT);
      // Get the account ID from the test account to ensure they match
      const solanaAccountId = MOCK_SOLANA_ACCOUNT.id;

      // Use Solana native asset
      const solNativeAssetId = SOL_NATIVE_CURRENCY;
      // Use a different SPL token (non-native) with a different unit
      const solTokenAssetId = `${SolScope.Mainnet}/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`;

      const mockBalances = {
        [solanaAccountId]: {
          // Native SOL balance
          [solNativeAssetId]: { amount: '10', unit: 'SOL' },
          // SPL token balance with a different unit
          [solTokenAssetId]: { amount: '20', unit: 'JUP' },
        },
      };

      const mockAssets = {
        [solanaAccountId]: [
          solNativeAssetId,
          solTokenAssetId,
        ] as CaipAssetType[],
      };

      const mockAssetsRates = {
        [solNativeAssetId]: { rate: '100', conversionTime: 0 },
        [solTokenAssetId]: { rate: '2', conversionTime: 0 },
      };

      // Inject mocks into state
      mockState.engine.backgroundState.MultichainBalancesController.balances =
        mockBalances;
      mockState.engine.backgroundState.MultichainAssetsController.accountsAssets =
        mockAssets;
      mockState.engine.backgroundState.MultichainAssetsRatesController.conversionRates =
        mockAssetsRates;

      // Explicitly set the selected account to make sure it matches
      mockState.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const result =
        selectSelectedAccountMultichainNetworkAggregatedBalance(mockState);

      // Expect only the native asset amount
      expect(result.totalNativeTokenBalance?.amount).toEqual('10');
      expect(result.totalNativeTokenBalance?.unit).toEqual('SOL');
      // Expect total fiat balance: (10 SOL * $100) + (20 JUP * $2) = $1000 + $40 = $1040
      expect(result.totalBalanceFiat).toEqual(1040);
    });
  });

  describe('selectMultichainTokenListForAccountsAnyChain', () => {
    it('returns empty list when accounts array is empty', () => {
      const state = getNonEvmState();

      const result = selectMultichainTokenListForAccountsAnyChain(state, []);

      expect(result).toEqual([]);
    });

    it('returns tokens with fiat balance for multiple accounts across chains', () => {
      const state = getNonEvmState();
      const accountMainnet = MOCK_ACCOUNT_BIP122_P2WPKH;
      const accountTestnet = MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET;

      const mainnetAssetId = BTC_NATIVE_CURRENCY;
      const testnetAssetId = BTC_TESTNET_NATIVE_CURRENCY;

      state.engine.backgroundState.MultichainBalancesController.balances = {
        [accountMainnet.id]: {
          [mainnetAssetId]: {
            amount: '1.00000000',
            unit: 'BTC',
          },
        },
        [accountTestnet.id]: {
          [testnetAssetId]: {
            amount: '2.00000000',
            unit: 'tBTC',
          },
        },
      };

      state.engine.backgroundState.MultichainAssetsController = {
        accountsAssets: {
          [accountMainnet.id]: [mainnetAssetId] as CaipAssetType[],
          [accountTestnet.id]: [testnetAssetId] as CaipAssetType[],
        },
        assetsMetadata: {
          [mainnetAssetId]: {
            name: 'Bitcoin',
            symbol: 'BTC',
            fungible: true,
            units: [
              {
                name: mainnetAssetId,
                symbol: 'BTC',
                decimals: 8,
              },
            ],
          },
          [testnetAssetId]: {
            name: 'Bitcoin Testnet',
            symbol: 'tBTC',
            fungible: true,
            units: [
              {
                name: testnetAssetId,
                symbol: 'tBTC',
                decimals: 8,
              },
            ],
          },
        },
        allIgnoredAssets: {},
      } as unknown as (typeof state.engine.backgroundState)['MultichainAssetsController'];

      state.engine.backgroundState.MultichainAssetsRatesController = {
        conversionRates: {
          [mainnetAssetId]: { rate: '50000', conversionTime: 0 },
          [testnetAssetId]: { rate: '25000', conversionTime: 0 },
        },
        assetsRates: {},
        historicalPrices: {},
      } as unknown as (typeof state.engine.backgroundState)['MultichainAssetsRatesController'];

      const result = selectMultichainTokenListForAccountsAnyChain(state, [
        accountMainnet,
        accountTestnet,
      ]);

      expect(result).toHaveLength(2);

      const btcToken = result.find((token) => token.address === mainnetAssetId);
      const tbtcToken = result.find(
        (token) => token.address === testnetAssetId,
      );

      expect(btcToken).toMatchObject({
        name: 'Bitcoin',
        symbol: 'BTC',
        chainId: BtcScope.Mainnet,
        isNative: true,
        balance: '1.00000000',
        balanceFiat: '50000',
        accountType: accountMainnet.type,
      });

      expect(tbtcToken).toMatchObject({
        name: 'Bitcoin Testnet',
        symbol: 'tBTC',
        chainId: BtcScope.Testnet,
        isNative: true,
        balance: '2.00000000',
        balanceFiat: '50000',
        accountType: accountTestnet.type,
      });
    });
  });

  describe('selectAccountTokensAcrossChainsUnified', () => {
    it('returns EVM tokens when no account group is selected', () => {
      jest.isolateModules(() => {
        // eslint-disable-next-line prefer-const
        let mockEvmTokensByChain: Record<string, unknown> | undefined;
        // eslint-disable-next-line prefer-const
        let mockSelectedGroupAccounts: InternalAccount[] | undefined;

        jest.doMock('../multichain', () => ({
          selectAccountTokensAcrossChains: () => mockEvmTokensByChain,
        }));

        jest.doMock('../multichainAccounts/accountTreeController', () => ({
          selectSelectedAccountGroupInternalAccounts: () =>
            mockSelectedGroupAccounts,
        }));

        const { selectAccountTokensAcrossChainsUnified } =
          jest.requireActual('./multichain');

        mockEvmTokensByChain = {
          '0x1': [
            {
              address: '0xevm-token',
              symbol: 'EVM',
            },
          ],
        };
        mockSelectedGroupAccounts = [];

        const state = {} as RootState;

        const result = selectAccountTokensAcrossChainsUnified(state);

        expect(result).toEqual(mockEvmTokensByChain);
      });
    });

    it('adds non-EVM tokens for selected accounts and filters Tron resources and non-mainnet Tron tokens', () => {
      jest.isolateModules(() => {
        // eslint-disable-next-line prefer-const
        let mockEvmTokensByChain: Record<string, unknown> | undefined;
        // eslint-disable-next-line prefer-const
        let mockSelectedGroupAccounts: InternalAccount[] | undefined;

        jest.doMock('../multichain', () => ({
          selectAccountTokensAcrossChains: () => mockEvmTokensByChain,
        }));

        jest.doMock('../multichainAccounts/accountTreeController', () => ({
          selectSelectedAccountGroupInternalAccounts: () =>
            mockSelectedGroupAccounts,
        }));

        const { selectAccountTokensAcrossChainsUnified } =
          jest.requireActual('./multichain');

        const tronMainnetChainId = TrxScope.Mainnet;
        const tronTestnetChainId = TrxScope.Nile;

        const tronMainnetAssetId =
          `${tronMainnetChainId}/slip44:195` as CaipAssetType;
        const tronResourceAssetId =
          `${tronMainnetChainId}/token:resource-energy` as CaipAssetType;
        const tronTestnetAssetId =
          `${tronTestnetChainId}/slip44:195` as CaipAssetType;

        const accountMain = {
          id: 'account-main',
          type: 'main-account-type',
        } as unknown as InternalAccount;

        const accountSecondary = {
          id: 'account-secondary',
          type: 'secondary-account-type',
        } as unknown as InternalAccount;

        mockEvmTokensByChain = {
          '0x1': [
            {
              address: '0xevm-token',
              symbol: 'EVM',
            },
          ],
        };

        mockSelectedGroupAccounts = [accountMain, accountSecondary];

        const state = {
          engine: {
            backgroundState: {
              MultichainBalancesController: {
                balances: {
                  [accountMain.id]: {
                    [tronMainnetAssetId]: {
                      amount: '10',
                      unit: 'TRX',
                    },
                    [tronResourceAssetId]: {
                      amount: '5',
                      unit: 'energy',
                    },
                    [tronTestnetAssetId]: {
                      amount: '3',
                      unit: 'TRX',
                    },
                  },
                  [accountSecondary.id]: {
                    [tronMainnetAssetId]: {
                      amount: '20',
                      unit: 'TRX',
                    },
                  },
                },
              },
              MultichainAssetsController: {
                accountsAssets: {
                  [accountMain.id]: [
                    tronMainnetAssetId,
                    tronResourceAssetId,
                    tronTestnetAssetId,
                  ] as CaipAssetType[],
                  [accountSecondary.id]: [
                    tronMainnetAssetId,
                  ] as CaipAssetType[],
                },
                assetsMetadata: {
                  [tronMainnetAssetId]: {
                    name: 'Tron',
                    symbol: 'TRX',
                    fungible: true,
                    units: [
                      {
                        name: tronMainnetAssetId,
                        symbol: 'TRX',
                        decimals: 6,
                      },
                    ],
                  },
                  [tronResourceAssetId]: {
                    name: 'Energy',
                    symbol: 'energy',
                    fungible: true,
                    units: [
                      {
                        name: tronResourceAssetId,
                        symbol: 'energy',
                        decimals: 6,
                      },
                    ],
                  },
                  [tronTestnetAssetId]: {
                    name: 'Tron Testnet',
                    symbol: 'TRX',
                    fungible: true,
                    units: [
                      {
                        name: tronTestnetAssetId,
                        symbol: 'TRX',
                        decimals: 6,
                      },
                    ],
                  },
                },
                allIgnoredAssets: {},
              },
              MultichainAssetsRatesController: {
                conversionRates: {},
                assetsRates: {
                  [tronMainnetAssetId]: {
                    rate: '1',
                    conversionTime: 0,
                  },
                  [tronResourceAssetId]: {
                    rate: '1',
                    conversionTime: 0,
                  },
                  [tronTestnetAssetId]: {
                    rate: '1',
                    conversionTime: 0,
                  },
                },
                historicalPrices: {},
              },
            },
          },
        } as unknown as RootState;

        const result = selectAccountTokensAcrossChainsUnified(state);

        expect(result['0x1']).toEqual(mockEvmTokensByChain['0x1']);
        expect(result[tronMainnetChainId]).toHaveLength(1);

        const tronToken = result[tronMainnetChainId][0] as {
          address: string;
          symbol: string;
          balance: string;
          accountType: string;
        };

        expect(tronToken.address).toBe(tronMainnetAssetId);
        expect(tronToken.symbol).toBe('TRX');
        expect(tronToken.balance).toBe('10');
        expect(tronToken.accountType).toBe(accountMain.type);
      });
    });
  });

  describe('selectSolanaAccountTransactions', () => {
    it('returns transactions for the selected Solana account', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);

      const mockTransactionData = {
        transactions: [
          {
            id: 'sol-tx-id',
            timestamp: 1733736433,
            chain: SolScope.Mainnet,
            status: 'confirmed' as const,
            type: 'send' as const,
            account: MOCK_SOLANA_ACCOUNT.id,
            from: [],
            to: [],
            fees: [],
            events: [],
          },
        ],
        next: null,
        lastUpdated: Date.now(),
      };

      state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
        {
          [MOCK_SOLANA_ACCOUNT.id]: {
            [SolScope.Mainnet]: mockTransactionData,
          },
        };

      expect(selectNonEvmTransactions(state)).toEqual(mockTransactionData);
    });

    it('returns empty array when no Solana account is selected', () => {
      const state = getEvmState();
      expect(selectNonEvmTransactions(state)).toEqual({
        lastUpdated: 0,
        next: null,
        transactions: [],
      });
    });

    it('returns empty array when Solana account has no transactions', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);

      state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
        {
          [MOCK_SOLANA_ACCOUNT.id]: {
            [SolScope.Mainnet]: {
              transactions: [],
              next: null,
              lastUpdated: Date.now(),
            },
          },
        };

      expect(selectNonEvmTransactions(state)).toEqual({
        lastUpdated: undefined,
        next: null,
        transactions: [],
      });
    });

    it('returns mainnet transactions normally', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);

      const mockTransactionData = {
        transactions: [
          {
            id: 'sol-tx-id',
            timestamp: 1733736433,
            chain: SolScope.Mainnet,
            status: 'confirmed' as const,
            type: 'send' as const,
            account: MOCK_SOLANA_ACCOUNT.id,
            from: [],
            to: [],
            fees: [],
            events: [],
          },
        ],
        next: null,
        lastUpdated: Date.now(),
      };

      state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
        {
          [MOCK_SOLANA_ACCOUNT.id]: {
            [SolScope.Mainnet]: mockTransactionData,
          },
        };

      expect(selectNonEvmTransactions(state)).toEqual(mockTransactionData);
    });

    it('blocks devnet transactions when feature flag is disabled', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT, undefined, true, false);
      state.engine.backgroundState.MultichainNetworkController.selectedMultichainNetworkChainId =
        SolScope.Devnet;

      state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
        {
          [MOCK_SOLANA_ACCOUNT.id]: {
            [SolScope.Devnet]: {
              transactions: [
                {
                  id: 'devnet-tx',
                  timestamp: 1733736433,
                  chain: SolScope.Devnet,
                  status: 'confirmed' as const,
                  type: 'send' as const,
                  account: MOCK_SOLANA_ACCOUNT.id,
                  from: [],
                  to: [],
                  fees: [],
                  events: [],
                },
              ],
              next: null,
              lastUpdated: Date.now(),
            },
          },
        };

      // Returns empty state when devnet is selected but feature flag is disabled
      expect(selectNonEvmTransactions(state)).toEqual({
        lastUpdated: 0,
        next: null,
        transactions: [],
      });
    });

    it('allows devnet transactions when feature flag is enabled', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT, undefined, true, true);
      state.engine.backgroundState.MultichainNetworkController.selectedMultichainNetworkChainId =
        SolScope.Devnet;

      const mockDevnetData = {
        transactions: [
          {
            id: 'devnet-tx',
            timestamp: 1733736433,
            chain: SolScope.Devnet,
            status: 'confirmed' as const,
            type: 'send' as const,
            account: MOCK_SOLANA_ACCOUNT.id,
            from: [],
            to: [],
            fees: [],
            events: [],
          },
        ],
        next: null,
        lastUpdated: Date.now(),
      };

      state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
        {
          [MOCK_SOLANA_ACCOUNT.id]: {
            [SolScope.Devnet]: mockDevnetData,
          },
        };

      expect(selectNonEvmTransactions(state)).toEqual(mockDevnetData);
    });
  });

  describe('selectNonEvmTransactionsForSelectedAccountGroup', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
    });

    it('returns default empty entry when no group accounts are selected', () => {
      jest.isolateModules(() => {
        jest.doMock('@sentry/react-native', () => ({
          captureException: jest.fn(),
        }));
        jest.doMock('../multichainAccounts/accountTreeController', () => ({
          selectSelectedAccountGroupInternalAccounts: jest
            .fn()
            .mockReturnValue([]),
        }));

        const { selectNonEvmTransactionsForSelectedAccountGroup } =
          jest.requireActual('./multichain');

        const state = getNonEvmState();

        expect(selectNonEvmTransactionsForSelectedAccountGroup(state)).toEqual({
          transactions: [],
          next: null,
          lastUpdated: 0,
        });
      });
    });

    it('aggregates and sorts transactions across accounts and chains, using max lastUpdated', () => {
      jest.isolateModules(() => {
        jest.doMock('@sentry/react-native', () => ({
          captureException: jest.fn(),
        }));
        jest.doMock('../multichainAccounts/accountTreeController', () => ({
          selectSelectedAccountGroupInternalAccounts: jest
            .fn()
            .mockReturnValue([MOCK_ACCOUNT_BIP122_P2WPKH, MOCK_SOLANA_ACCOUNT]),
        }));

        const { selectNonEvmTransactionsForSelectedAccountGroup } =
          jest.requireActual('./multichain');

        const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);

        // Arrange transactions for multiple accounts/chains
        state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
          {
            [MOCK_ACCOUNT_BIP122_P2WPKH.id]: {
              [BtcScope.Mainnet]: {
                transactions: [
                  { id: 'btc-1', timestamp: 100 },
                  { id: 'btc-2', timestamp: 300 },
                ],
                next: null,
                lastUpdated: 1000,
              },
            },
            [MOCK_SOLANA_ACCOUNT.id]: {
              [SolScope.Mainnet]: {
                transactions: [{ id: 'sol-1', timestamp: 200 }],
                next: null,
                lastUpdated: 1100,
              },
            },
            // Noise: account not in the selected group
            [MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET.id]: {
              [BtcScope.Testnet]: {
                transactions: [{ id: 'tbtc-1', timestamp: 999 }],
                next: null,
                lastUpdated: 1200,
              },
            },
          } as unknown as typeof state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions;

        const result = selectNonEvmTransactionsForSelectedAccountGroup(state);

        expect(result.transactions.map((t: TestTransaction) => t.id)).toEqual([
          'btc-2',
          'sol-1',
          'btc-1',
        ]);
        expect(result.lastUpdated).toBe(1100);
        expect(result.next).toBeNull();
      });
    });

    it('supports single-level transaction structure per account', () => {
      jest.isolateModules(() => {
        jest.doMock('@sentry/react-native', () => ({
          captureException: jest.fn(),
        }));
        jest.doMock('../multichainAccounts/accountTreeController', () => ({
          selectSelectedAccountGroupInternalAccounts: jest
            .fn()
            .mockReturnValue([MOCK_ACCOUNT_BIP122_P2WPKH]),
        }));

        const { selectNonEvmTransactionsForSelectedAccountGroup } =
          jest.requireActual('./multichain');

        const state = getNonEvmState(MOCK_ACCOUNT_BIP122_P2WPKH);

        // Single-level structure (no chain nesting)
        state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
          {
            [MOCK_ACCOUNT_BIP122_P2WPKH.id]: {
              transactions: [
                { id: 'a', timestamp: 1 },
                { id: 'b', timestamp: 3 },
                { id: 'c', timestamp: 2 },
              ],
              next: null,
              lastUpdated: 500,
            },
          } as unknown as typeof state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions;

        const result = selectNonEvmTransactionsForSelectedAccountGroup(state);

        expect(result.transactions.map((t: TestTransaction) => t.id)).toEqual([
          'b',
          'c',
          'a',
        ]);
        expect(result.lastUpdated).toBe(500);
        expect(result.next).toBeNull();
      });
    });

    it('returns empty transactions with undefined lastUpdated when group accounts have no entries', () => {
      jest.isolateModules(() => {
        jest.doMock('@sentry/react-native', () => ({
          captureException: jest.fn(),
        }));
        jest.doMock('../multichainAccounts/accountTreeController', () => ({
          selectSelectedAccountGroupInternalAccounts: jest
            .fn()
            .mockReturnValue([MOCK_ACCOUNT_BIP122_P2WPKH]),
        }));

        const { selectNonEvmTransactionsForSelectedAccountGroup } =
          jest.requireActual('./multichain');

        const state = getNonEvmState(MOCK_ACCOUNT_BIP122_P2WPKH);
        // No entries for selected account
        state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
          {} as unknown as typeof state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions;

        const result = selectNonEvmTransactionsForSelectedAccountGroup(state);

        expect(result).toEqual({
          transactions: [],
          next: null,
          lastUpdated: 0,
        });
      });
    });
  });

  describe('selectMultichainHistoricalPrices', () => {
    const testAsset = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';

    it('returns empty object if no historical prices are available', () => {
      const state = getEvmState(undefined);
      state.engine.backgroundState.MultichainAssetsRatesController.historicalPrices =
        {};

      expect(selectMultichainHistoricalPrices(state)).toStrictEqual({});
    });

    it('Returns historical prices for a given asset', () => {
      const testCurrency = 'usd';
      const state = getEvmState(undefined);
      const mockHistoricalPricesForAsset = {
        [testCurrency]: {
          intervals: {},
          updateTime: 1737542312,
          expirationTime: 1737542312,
        },
      };
      state.engine.backgroundState.MultichainAssetsRatesController.historicalPrices =
        {
          [testAsset]: mockHistoricalPricesForAsset,
        };

      expect(selectMultichainHistoricalPrices(state)).toStrictEqual({
        [testAsset]: mockHistoricalPricesForAsset,
      });
    });
  });

  describe('makeSelectNonEvmAssetById', () => {
    const selectNonEvmAssetById = makeSelectNonEvmAssetById();
    const mockAccountId = MOCK_ACCOUNT_BIP122_P2WPKH.id;
    const mockAssetId = BTC_NATIVE_CURRENCY;
    const mockRate = '25000.00';

    const mockState = getNonEvmState(MOCK_ACCOUNT_BIP122_P2WPKH, mockRate);

    it('should return undefined when EVM network is selected', () => {
      const evmState = getEvmState();
      const result = selectNonEvmAssetById(evmState, {
        accountId: mockAccountId,
        assetId: mockAssetId,
      });
      expect(result).toBeUndefined();
    });

    it('should throw error when accountId is not provided', () => {
      expect(() => {
        selectNonEvmAssetById(mockState, {
          accountId: undefined,
          assetId: mockAssetId,
        });
      }).toThrow('Account ID is required to fetch asset.');
    });

    it('should return asset with correct structure for native asset', () => {
      const result = selectNonEvmAssetById(mockState, {
        accountId: mockAccountId,
        assetId: mockAssetId,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('symbol', 'BTC');
      expect(result).toHaveProperty('address', mockAssetId);
      expect(result).toHaveProperty('chainId', BtcScope.Mainnet);
    });

    it('should handle missing balance gracefully', () => {
      const stateWithoutBalance = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            MultichainBalancesController: {
              balances: {},
            },
          },
        },
      } as unknown as RootState;

      const result = selectNonEvmAssetById(stateWithoutBalance, {
        accountId: mockAccountId,
        assetId: mockAssetId,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('balance', undefined);
      expect(result).toHaveProperty('balanceFiat', undefined);
    });

    it('should handle missing metadata gracefully', () => {
      const stateWithoutMetadata = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            MultichainAssetsController: {
              assetsMetadata: {},
            },
          },
        },
      } as unknown as RootState;

      const result = selectNonEvmAssetById(stateWithoutMetadata, {
        accountId: mockAccountId,
        assetId: mockAssetId,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('name', 'BTC');
      expect(result).toHaveProperty('symbol', 'BTC');
      expect(result).toHaveProperty('decimals', 0);
    });

    it('should handle missing rates gracefully', () => {
      const stateWithoutRates = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            MultichainAssetsRatesController: {
              assetsRates: {},
            },
          },
        },
      } as unknown as RootState;

      const result = selectNonEvmAssetById(stateWithoutRates, {
        accountId: mockAccountId,
        assetId: mockAssetId,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('balanceFiat', '0');
    });
  });
});
