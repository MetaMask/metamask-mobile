import {
  MultichainNativeAssets,
  MultichainNetworks,
} from '@metamask/assets-controllers';
import { RootState } from '../../reducers';
import {
  selectIsBitcoinSupportEnabled,
  selectIsBitcoinTestnetSupportEnabled,
  selectIsSolanaSupportEnabled,
  selectMultichainCurrentNetwork,
  selectMultichainDefaultToken,
  selectMultichainIsBitcoin,
  selectMultichainIsEvm,
  selectMultichainIsMainnet,
  selectMultichainNetworkProviders,
  selectMultichainSelectedAccountCachedBalance,
  selectMultichainShouldShowFiat,
  selectMultichainConversionRate,
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
import { MULTICHAIN_PROVIDER_CONFIGS } from '../../core/Multichain/constants';

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

  const state = {
    ...getEvmState(undefined, 1500, showFiatOnTestnets),
    engine: {
      backgroundState: {
        ...getEvmState().engine.backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: selectedAccount.id,
            accounts: mockNonEvmAccountsArray,
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

  describe('selectMultichainNetworkProviders', () => {
    it('returns all multichain providers', () => {
      const networkProviders = selectMultichainNetworkProviders();
      expect(Array.isArray(networkProviders)).toBe(true);
      expect(networkProviders.length).toBe(5);
    });

    it('returns correct decimal values for each network', () => {
      const networkProviders = selectMultichainNetworkProviders();

      // Bitcoin networks should have 8 decimals
      const bitcoinMainnet = networkProviders.find(
        (provider) => provider.id === 'btc-mainnet',
      );
      expect(bitcoinMainnet?.decimal).toBe(8);

      const bitcoinTestnet = networkProviders.find(
        (provider) => provider.id === 'btc-testnet',
      );
      expect(bitcoinTestnet?.decimal).toBe(8);

      // Solana networks should have 9 decimals
      const solanaMainnet = networkProviders.find(
        (provider) => provider.id === 'solana-mainnet',
      );
      expect(solanaMainnet?.decimal).toBe(9);

      const solanaDevnet = networkProviders.find(
        (provider) => provider.id === 'solana-devnet',
      );
      expect(solanaDevnet?.decimal).toBe(9);

      const solanaTestnet = networkProviders.find(
        (provider) => provider.id === 'solana-testnet',
      );
      expect(solanaTestnet?.decimal).toBe(9);
    });
  });
  describe('selectMultichainIsEvm', () => {
    it('returns true if selected account is EVM compatible', () => {
      const state = getEvmState();

      expect(selectMultichainIsEvm(state)).toBe(true);
    });

    it('returns false if selected account is not EVM compatible', () => {
      const state = getNonEvmState();
      expect(selectMultichainIsEvm(state)).toBe(false);
    });

    it('returns false if selected account is Solana', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);
      expect(selectMultichainIsEvm(state)).toBe(false);
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
  describe('selectMultichainCurrentNetwork', () => {
    it('returns an EVM network provider if account is EVM', () => {
      const state = getEvmState();

      const network = selectMultichainCurrentNetwork(state);
      expect(network.isEvmNetwork).toBe(true);
    });

    it('returns an non-EVM network provider if account is non-EVM', () => {
      const state = getNonEvmState();

      const network = selectMultichainCurrentNetwork(state);
      expect(network.isEvmNetwork).toBe(false);
    });

    it('returns a nickname for default networks', () => {
      const state = getEvmState();

      const network = selectMultichainCurrentNetwork(state);
      expect(network.nickname).toBe('Ethereum Mainnet');
    });
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
  describe('selectMultichainIsBitcoin', () => {
    it('returns false if account is EVM', () => {
      const state = getEvmState();
      expect(selectMultichainIsBitcoin(state)).toBe(false);
    });

    it('returns true if account is BTC', () => {
      const state = getNonEvmState(MOCK_ACCOUNT_BIP122_P2WPKH);
      expect(selectMultichainIsBitcoin(state)).toBe(true);
    });
    it('returns true if account is BTC testnet', () => {
      const state = getNonEvmState(MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET);
      expect(selectMultichainIsBitcoin(state)).toBe(true);
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
        symbol: MULTICHAIN_PROVIDER_CONFIGS[MultichainNetworks.Bitcoin].ticker,
      });
    });

    it('returns SOL if account is Solana', () => {
      const state = getNonEvmState(MOCK_SOLANA_ACCOUNT);
      expect(selectMultichainDefaultToken(state)).toEqual({
        symbol: MULTICHAIN_PROVIDER_CONFIGS[MultichainNetworks.Solana].ticker,
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
});
