import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import type { RootState } from '../../../reducers';
import {
  MAINNET_ETH_TO_BTC_SWAP_PAIR,
  MAINNET_MUSD_TO_ETH_SWAP_PAIR,
  selectWalletHomeOnboardingTradeSwapPair,
} from './walletHomeOnboardingTradeSwapBalances';
import {
  MAINNET_MUSD_TOKEN_ADDRESS,
  MAINNET_MUSD_TOKEN_BALANCE_LOOKUP_ADDRESS,
  MAINNET_NATIVE_ETH_TOKEN_ADDRESS,
} from './walletHomeOnboardingTradeSwapAssets';

const ACCOUNT = '0xAccount1' as Hex;
const ACCOUNT_ID = 'account1';
const NATIVE_ETH_ASSET_ID = 'eip155:1/slip44:60';
const MUSD_ASSET_ID = `eip155:1/erc20:${MAINNET_MUSD_TOKEN_ADDRESS}`;

function buildStateWithMainnetBalances(
  mainnetBalances: Record<string, string>,
): RootState {
  const assetsInfo: Record<string, object> = {};
  const accountBalances: Record<string, { amount: string }> = {};

  // TokenBalancesController keys were checksummed. Only seed mUSD in the
  // unified controller when the checksummed lookup address is present so the
  // lowercase-key case still falls through to ETH → BTC.
  if (mainnetBalances[MAINNET_MUSD_TOKEN_BALANCE_LOOKUP_ADDRESS]) {
    assetsInfo[MUSD_ASSET_ID] = {
      type: 'erc20',
      symbol: 'mUSD',
      name: 'MetaMask USD',
      decimals: 6,
    };
    accountBalances[MUSD_ASSET_ID] = { amount: '1' };
  }

  if (mainnetBalances[MAINNET_NATIVE_ETH_TOKEN_ADDRESS]) {
    assetsInfo[NATIVE_ETH_ASSET_ID] = {
      type: 'native',
      symbol: 'ETH',
      name: 'Ether',
      decimals: 18,
    };
    accountBalances[NATIVE_ETH_ASSET_ID] = {
      amount:
        mainnetBalances[MAINNET_NATIVE_ETH_TOKEN_ADDRESS] === '0x0' ? '0' : '1',
    };
  }

  return {
    engine: {
      backgroundState: {
        TokenBalancesController: {
          tokenBalances: {
            [ACCOUNT]: {
              [CHAIN_IDS.MAINNET]: mainnetBalances,
            },
          },
        },
        AssetsController: {
          assetsInfo,
          assetsBalance: { [ACCOUNT_ID]: accountBalances },
          customAssets: {},
          assetsPrice: {},
          selectedCurrency: 'usd',
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: ACCOUNT_ID,
            accounts: {
              [ACCOUNT_ID]: {
                id: ACCOUNT_ID,
                address: ACCOUNT,
                type: 'eip155:eoa',
              },
            },
          },
        },
      },
    },
  } as unknown as RootState;
}

describe('selectWalletHomeOnboardingTradeSwapPair', () => {
  it('returns stable pair references for repeated selection', () => {
    const state = buildStateWithMainnetBalances({
      [MAINNET_MUSD_TOKEN_BALANCE_LOOKUP_ADDRESS]: '0x1',
    });

    const first = selectWalletHomeOnboardingTradeSwapPair(state);
    const second = selectWalletHomeOnboardingTradeSwapPair(state);

    expect(first).toBe(MAINNET_MUSD_TO_ETH_SWAP_PAIR);
    expect(second).toBe(MAINNET_MUSD_TO_ETH_SWAP_PAIR);
    expect(first).toBe(second);
  });

  it('prefers mUSD → ETH when checksummed mUSD balance is positive', () => {
    const state = buildStateWithMainnetBalances({
      [MAINNET_MUSD_TOKEN_BALANCE_LOOKUP_ADDRESS]: '0x1',
      [MAINNET_NATIVE_ETH_TOKEN_ADDRESS]: '0x64',
    });

    expect(selectWalletHomeOnboardingTradeSwapPair(state)).toBe(
      MAINNET_MUSD_TO_ETH_SWAP_PAIR,
    );
  });

  it('does not match mUSD balance stored under lowercase address key', () => {
    const state = buildStateWithMainnetBalances({
      [MAINNET_MUSD_TOKEN_ADDRESS]: '0x1',
      [MAINNET_NATIVE_ETH_TOKEN_ADDRESS]: '0x64',
    });

    expect(selectWalletHomeOnboardingTradeSwapPair(state)).toBe(
      MAINNET_ETH_TO_BTC_SWAP_PAIR,
    );
  });

  it('uses ETH → BTC when only mainnet ETH balance is positive', () => {
    const state = buildStateWithMainnetBalances({
      [MAINNET_NATIVE_ETH_TOKEN_ADDRESS]: '0x64',
    });

    expect(selectWalletHomeOnboardingTradeSwapPair(state)).toBe(
      MAINNET_ETH_TO_BTC_SWAP_PAIR,
    );
  });

  it('returns undefined when neither mUSD nor ETH balance is positive', () => {
    const state = buildStateWithMainnetBalances({
      [MAINNET_NATIVE_ETH_TOKEN_ADDRESS]: '0x0',
    });

    expect(selectWalletHomeOnboardingTradeSwapPair(state)).toBeUndefined();
  });

  it('returns undefined when selected account is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          TokenBalancesController: {
            tokenBalances: {
              [ACCOUNT]: {
                [CHAIN_IDS.MAINNET]: {
                  [MAINNET_MUSD_TOKEN_BALANCE_LOOKUP_ADDRESS]: '0x1',
                },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'missing',
              accounts: {},
            },
          },
        },
      },
    } as unknown as RootState;

    expect(selectWalletHomeOnboardingTradeSwapPair(state)).toBeUndefined();
  });
});
