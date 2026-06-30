import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  MONEY_NO_FEE_TOKENS_FALLBACK,
  ensureMonadMusdListed,
  formatNoFeeTokenBullets,
} from './depositFaqTokens';

describe('depositFaqTokens', () => {
  describe('ensureMonadMusdListed', () => {
    it('appends MUSD after existing Monad tokens', () => {
      expect(
        ensureMonadMusdListed({ [CHAIN_IDS.MONAD]: ['USDC'] })[CHAIN_IDS.MONAD],
      ).toEqual(['USDC', 'MUSD']);
    });

    it('adds a Monad entry when the chain is absent', () => {
      expect(ensureMonadMusdListed({ '0x1': ['USDC'] })).toEqual({
        '0x1': ['USDC'],
        [CHAIN_IDS.MONAD]: ['MUSD'],
      });
    });

    it('does not duplicate MUSD when already present', () => {
      expect(
        ensureMonadMusdListed({ [CHAIN_IDS.MONAD]: ['USDC', 'MUSD'] })[
          CHAIN_IDS.MONAD
        ],
      ).toEqual(['USDC', 'MUSD']);
    });

    it('does not mutate the input list', () => {
      const input = { [CHAIN_IDS.MONAD]: ['USDC'] };
      ensureMonadMusdListed(input);
      expect(input[CHAIN_IDS.MONAD]).toEqual(['USDC']);
    });
  });

  describe('formatNoFeeTokenBullets', () => {
    it('formats each chain as a bullet line with a friendly network name', () => {
      expect(formatNoFeeTokenBullets(MONEY_NO_FEE_TOKENS_FALLBACK)).toBe(
        [
          '• Ethereum: USDC, aUSDC, USDT, aUSDT, DAI, aDAI, MUSD',
          '• Linea: MUSD',
          '• Arbitrum: USDC, aUSDCN',
          '• Base: USDC, aUSDC',
          '• BNB Chain: USDC, aUSDC, aUSDT, USDT',
          '• Monad: USDC',
        ].join('\n'),
      );
    });

    it('omits chains without a known network name', () => {
      expect(
        formatNoFeeTokenBullets({ '0x1': ['USDC'], '0x999999': ['USDC'] }),
      ).toBe('• Ethereum: USDC');
    });

    it('includes mUSD in the per-chain deposit list', () => {
      expect(
        formatNoFeeTokenBullets({
          '0x1': ['USDC', 'mUSD'],
          '0xe708': ['mUSD'],
        }),
      ).toBe('• Ethereum: USDC, mUSD\n• Linea: mUSD');
    });
  });
});
