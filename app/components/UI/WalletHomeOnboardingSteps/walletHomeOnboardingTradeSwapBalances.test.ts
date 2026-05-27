import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import type { RootState } from '../../../reducers';
import {
  hasMainnetEthBalance,
  hasMainnetMusdBalance,
  hasPositiveHexTokenBalance,
  MAINNET_ETH_TO_BTC_SWAP_PAIR,
  MAINNET_MUSD_TO_ETH_SWAP_PAIR,
  resolveWalletHomeOnboardingTradeSwapPair,
} from './walletHomeOnboardingTradeSwapBalances';
import {
  MAINNET_MUSD_TOKEN_ADDRESS,
  MAINNET_NATIVE_ETH_TOKEN_ADDRESS,
} from './walletHomeOnboardingTradeSwapAssets';

const ACCOUNT = '0xAccount1' as Hex;

function buildStateWithTokenBalance(
  tokenAddress: Hex,
  balanceHex: string,
): RootState {
  return {
    engine: {
      backgroundState: {
        TokenBalancesController: {
          tokenBalances: {
            [ACCOUNT]: {
              [CHAIN_IDS.MAINNET]: {
                [tokenAddress]: balanceHex,
              },
            },
          },
        },
      },
    },
  } as unknown as RootState;
}

describe('walletHomeOnboardingTradeSwapBalances', () => {
  describe('hasPositiveHexTokenBalance', () => {
    it('returns false for missing or zero balance', () => {
      expect(hasPositiveHexTokenBalance(undefined)).toBe(false);
      expect(hasPositiveHexTokenBalance('0x0')).toBe(false);
    });

    it('returns true for positive balance', () => {
      expect(hasPositiveHexTokenBalance('0x1')).toBe(true);
      expect(hasPositiveHexTokenBalance('0x100')).toBe(true);
    });
  });

  describe('hasMainnetMusdBalance', () => {
    it('detects positive mUSD balance on mainnet', () => {
      const state = buildStateWithTokenBalance(
        MAINNET_MUSD_TOKEN_ADDRESS,
        '0x1',
      );
      expect(hasMainnetMusdBalance(state, ACCOUNT)).toBe(true);
    });
  });

  describe('hasMainnetEthBalance', () => {
    it('detects positive native ETH balance on mainnet', () => {
      const state = buildStateWithTokenBalance(
        MAINNET_NATIVE_ETH_TOKEN_ADDRESS,
        '0x64',
      );
      expect(hasMainnetEthBalance(state, ACCOUNT)).toBe(true);
    });
  });

  describe('resolveWalletHomeOnboardingTradeSwapPair', () => {
    it('returns stable pair object references for repeated resolution', () => {
      const state = buildStateWithTokenBalance(
        MAINNET_MUSD_TOKEN_ADDRESS,
        '0x1',
      );

      const first = resolveWalletHomeOnboardingTradeSwapPair(state, ACCOUNT);
      const second = resolveWalletHomeOnboardingTradeSwapPair(state, ACCOUNT);

      expect(first).toBe(MAINNET_MUSD_TO_ETH_SWAP_PAIR);
      expect(second).toBe(MAINNET_MUSD_TO_ETH_SWAP_PAIR);
      expect(first).toBe(second);
    });

    it('prefers mUSD → ETH when mUSD balance is positive', () => {
      const state = {
        engine: {
          backgroundState: {
            TokenBalancesController: {
              tokenBalances: {
                [ACCOUNT]: {
                  [CHAIN_IDS.MAINNET]: {
                    [MAINNET_MUSD_TOKEN_ADDRESS]: '0x1',
                    [MAINNET_NATIVE_ETH_TOKEN_ADDRESS]: '0x64',
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const pair = resolveWalletHomeOnboardingTradeSwapPair(state, ACCOUNT);

      expect(pair).toBe(MAINNET_MUSD_TO_ETH_SWAP_PAIR);
    });

    it('uses ETH → BTC when only ETH balance is positive', () => {
      const state = buildStateWithTokenBalance(
        MAINNET_NATIVE_ETH_TOKEN_ADDRESS,
        '0x64',
      );

      const pair = resolveWalletHomeOnboardingTradeSwapPair(state, ACCOUNT);

      expect(pair).toBe(MAINNET_ETH_TO_BTC_SWAP_PAIR);
    });

    it('returns undefined when neither mUSD nor ETH balance is positive', () => {
      const state = buildStateWithTokenBalance(
        MAINNET_NATIVE_ETH_TOKEN_ADDRESS,
        '0x0',
      );

      expect(
        resolveWalletHomeOnboardingTradeSwapPair(state, ACCOUNT),
      ).toBeUndefined();
    });
  });
});
