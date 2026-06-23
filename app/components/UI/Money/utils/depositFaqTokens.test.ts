import {
  MONEY_NO_FEE_TOKENS_FALLBACK,
  formatNoFeeTokenBullets,
} from './depositFaqTokens';

describe('depositFaqTokens', () => {
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
