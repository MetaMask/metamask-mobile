import { RootState } from '../../reducers';
import {
  selectIsBitcoinSupportEnabled,
  selectIsBitcoinTestnetSupportEnabled,
  selectIsSolanaSupportEnabled,
  selectMultichainDefaultToken,
  selectMultichainIsMainnet,
  selectMultichainSelectedAccountCachedBalance,
  selectMultichainShouldShowFiat,
  selectMultichainConversionRate,
  MultichainNativeAssets,
  selectMultichainCoinRates,
  selectMultichainBalances,
  MULTICHAIN_NETWORK_TO_ASSET_TYPES,
  selectMultichainTransactions,
  selectSolanaAccountTransactions,
} from './multichain';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
  MOCK_ACCOUNT_BIP122_P2WPKH,
  MOCK_SOLANA_ACCOUNT,
} from '../../util/test/accountsControllerTestUtils';
import { Hex } from '@metamask/utils';
import { selectAccountBalanceByChainId } from '../accountTrackerController';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { selectIsEvmNetworkSelected } from '../multichainNetworkController';
import { BtcScope, SolAccountType, SolScope } from '@metamask/keyring-api';

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
        MultichainBalancesController: {
          balances: {
            [mockBtcAccount.id]: {
              [MultichainNativeAssets.Bitcoin]: {
                amount: '1.00000000',
                unit: 'BTC',
              },
            },
            [mockBtcTestnetAccount.id]: {
              [MultichainNativeAssets.BitcoinTestnet]: {
                amount: '2.00000000',
                unit: 'BTC',
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
        RatesController: {
          rates: {},
          fiatCurrency: 'usd',
          cryptocurrencies: [],
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
    multichainSettings: {
      bitcoinSupportEnabled: true,
      bitcoinTestnetSupportEnabled: false,
      solanaSupportEnabled: true,
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
              name: 'Solana Mainnet',
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
              name: 'Bitcoin Mainnet',
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
  describe('Multichain Support Flags', () => {
    it('returns bitcoin support enabled state', () => {
      const mockState = getEvmState();
      expect(selectIsBitcoinSupportEnabled(mockState)).toBe(true);
    });

    it('returns bitcoin testnet support enabled state', () => {
      const mockState = getEvmState();
      expect(selectIsBitcoinTestnetSupportEnabled(mockState)).toBe(false);
    });
    it('returns Solana support enabled state', () => {
      const mockState = getEvmState();
      expect(selectIsSolanaSupportEnabled(mockState)).toBe(true);
    });
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
        network: 'mainnet',
        account: MOCK_ACCOUNT_BIP122_P2WPKH,
        asset: MultichainNativeAssets.Bitcoin,
      },
      {
        network: 'testnet',
        account: MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
        asset: MultichainNativeAssets.BitcoinTestnet,
      },
    ])(
      'returns cached balance if account is non-EVM: $network',
      ({
        account,
        asset,
      }: {
        account: InternalAccount;
        asset: MultichainNativeAssets;
      }) => {
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
          [MultichainNativeAssets.Solana]: {
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

  describe('selectMultichainConversionRate', () => {
    it('returns EVM conversion rate if account is EVM', () => {
      const mockEvmConversionRate = 1500;
      const state = getEvmState(undefined, mockEvmConversionRate);

      expect(selectMultichainConversionRate(state)).toBe(mockEvmConversionRate);
    });

    it('returns non-EVM conversion rate if account is non-EVM', () => {
      const mockBtcConversionRate = '45000.00';
      const state = getNonEvmState(undefined, mockBtcConversionRate);

      expect(selectMultichainConversionRate(state)).toBe(mockBtcConversionRate);
    });

    it('returns undefined if non-EVM ticker is not found', () => {
      const state = getNonEvmState();

      expect(selectMultichainConversionRate(state)).toBeUndefined();
    });

    it('returns Solana conversion rate if account is Solana', () => {
      const mockSolConversionRate = 100;
      const state = getNonEvmState(
        MOCK_SOLANA_ACCOUNT,
        mockSolConversionRate.toString(),
      );
      state.engine.backgroundState.RatesController.rates = {
        sol: {
          conversionRate: mockSolConversionRate,
          conversionDate: new Date().getTime(),
          usdConversionRate: mockSolConversionRate,
        },
      };

      expect(selectMultichainConversionRate(state)).toBe(mockSolConversionRate);
    });
  });

  describe('selectMultichainBalances and selectMultichainCoinRates', () => {
    it('selectMultichainBalances returns balances from the MultichainBalancesController state', () => {
      const state = getEvmState();
      const mockBalances = {
        'account-1': {
          [MultichainNativeAssets.Bitcoin]: { amount: '10', unit: 'BTC' },
        },
      };
      state.engine.backgroundState.MultichainBalancesController.balances =
        mockBalances;
      expect(selectMultichainBalances(state)).toEqual(mockBalances);
    });

    it('selectMultichainCoinRates returns rates from the RatesController state', () => {
      const state = getEvmState();
      const mockRates = {
        eth: {
          conversionRate: 2000,
          conversionDate: Date.now(),
          usdConversionRate: 2000,
        },
      };
      state.engine.backgroundState.RatesController.rates = mockRates;
      expect(selectMultichainCoinRates(state)).toEqual(mockRates);
    });

    it('NETWORK_ASSETS_MAP has correct mappings', () => {
      expect(MULTICHAIN_NETWORK_TO_ASSET_TYPES[SolScope.Mainnet]).toEqual([
        MultichainNativeAssets.Solana,
      ]);
      expect(MULTICHAIN_NETWORK_TO_ASSET_TYPES[SolScope.Testnet]).toEqual([
        MultichainNativeAssets.SolanaTestnet,
      ]);
      expect(MULTICHAIN_NETWORK_TO_ASSET_TYPES[SolScope.Devnet]).toEqual([
        MultichainNativeAssets.SolanaDevnet,
      ]);
      expect(MULTICHAIN_NETWORK_TO_ASSET_TYPES[BtcScope.Mainnet]).toEqual([
        MultichainNativeAssets.Bitcoin,
      ]);
      expect(MULTICHAIN_NETWORK_TO_ASSET_TYPES[BtcScope.Testnet]).toEqual([
        MultichainNativeAssets.BitcoinTestnet,
      ]);
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
              chain: MultichainNativeAssets.Bitcoin,
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
      };

      expect(selectMultichainTransactions(state)).toEqual(mockTransactions);
    });

    it('returns empty object when no transactions exist', () => {
      const state = getEvmState();

      state.engine.backgroundState.MultichainTransactionsController = {
        nonEvmTransactions: {},
      };

      expect(selectMultichainTransactions(state)).toEqual({});
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
            chain: MultichainNativeAssets.Solana,
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
          [MOCK_SOLANA_ACCOUNT.id]: mockTransactionData,
        };

      expect(selectSolanaAccountTransactions(state)).toEqual(
        mockTransactionData,
      );
    });

    it('returns empty array when no Solana account is selected', () => {
      const state = getEvmState();
      expect(selectSolanaAccountTransactions(state)).toEqual([]);
    });

    it('returns empty array when Solana account has no transactions', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);

      state.engine.backgroundState.MultichainTransactionsController.nonEvmTransactions =
        {};

      expect(selectSolanaAccountTransactions(state)).toEqual([]);
    });
  });
});
