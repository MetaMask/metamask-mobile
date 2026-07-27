import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  MONEY_NO_FEE_TOKENS_FALLBACK,
  ensureMonadMusdListed,
  formatNoFeeTokenBullets,
} from './depositFaqTokens';

describe('depositFaqTokens', () => {
  describe('ensureMonadMusdListed', () => {
    it('prepends mUSD before existing Monad tokens', () => {
      expect(
        ensureMonadMusdListed({ [CHAIN_IDS.MONAD]: ['USDC'] })[CHAIN_IDS.MONAD],
      ).toEqual(['mUSD', 'USDC']);
    });

    it('adds a Monad entry when the chain is absent', () => {
      expect(ensureMonadMusdListed({ '0x1': ['USDC'] })).toEqual({
        '0x1': ['USDC'],
        [CHAIN_IDS.MONAD]: ['mUSD'],
      });
    });

    it('moves mUSD to the front when present but not first', () => {
      expect(
        ensureMonadMusdListed({ [CHAIN_IDS.MONAD]: ['USDC', 'mUSD'] })[
          CHAIN_IDS.MONAD
        ],
      ).toEqual(['mUSD', 'USDC']);
    });

    it('does not duplicate mUSD when already first', () => {
      expect(
        ensureMonadMusdListed({ [CHAIN_IDS.MONAD]: ['mUSD', 'USDC'] })[
          CHAIN_IDS.MONAD
        ],
      ).toEqual(['mUSD', 'USDC']);
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
          '• Ethereum: USDC, aUSDC, USDT, aUSDT, DAI, aDAI, mUSD',
          '• Linea: mUSD',
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
