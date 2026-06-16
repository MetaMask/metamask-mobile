import {
  MONEY_NO_FEE_TOKENS_FALLBACK,
  resolveNoFeeTokens,
  formatNoFeeTokenBullets,
  formatBaseStablecoins,
} from './depositFaqTokens';

describe('depositFaqTokens', () => {
  describe('resolveNoFeeTokens', () => {
    it('returns the remote list when it is populated', () => {
      const remote = { '0x1': ['USDC'] };

      expect(resolveNoFeeTokens(remote)).toBe(remote);
    });

    it('falls back to the bundled list when remote is empty', () => {
      expect(resolveNoFeeTokens({})).toBe(MONEY_NO_FEE_TOKENS_FALLBACK);
    });
  });

  describe('formatNoFeeTokenBullets', () => {
    it('formats each chain as a bullet line with a friendly network name', () => {
      expect(formatNoFeeTokenBullets(MONEY_NO_FEE_TOKENS_FALLBACK)).toBe(
        [
          '• Ethereum: USDC, USDT, DAI, aUSDC, aUSDT, aDAI',
          '• Arbitrum: USDC',
          '• Base: USDC',
          '• BNB Chain: USDC, USDT',
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

  describe('formatBaseStablecoins', () => {
    it('returns the unique base stablecoins excluding aTokens, with an "or" list', () => {
      expect(formatBaseStablecoins(MONEY_NO_FEE_TOKENS_FALLBACK)).toBe(
        'USDC, USDT, or DAI',
      );
    });

    it('joins two stablecoins with "or"', () => {
      expect(formatBaseStablecoins({ '0x1': ['USDC', 'DAI'] })).toBe(
        'USDC or DAI',
      );
    });

    it('returns a single stablecoin without a connector', () => {
      expect(formatBaseStablecoins({ '0x1': ['USDC', 'aUSDC'] })).toBe('USDC');
    });

    it('excludes mUSD from the inline stablecoin list', () => {
      expect(formatBaseStablecoins({ '0x1': ['USDC', 'mUSD', 'DAI'] })).toBe(
        'USDC or DAI',
      );
    });
  });
});
