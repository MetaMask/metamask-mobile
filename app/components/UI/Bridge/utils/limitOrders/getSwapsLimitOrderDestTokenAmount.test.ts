import { LimitOrderExecutionType } from '../../constants/limitOrders';
import { getSwapsLimitOrderDestTokenAmount } from './getSwapsLimitOrderDestTokenAmount';

// Sells quote the price per source token and buys quote it per destination
// token, so each side pairs with the counter token on the opposite end of the
// trade: mUSD (6 decimals) when selling ETH, ETH (18 decimals) when buying it.
const sellTokenModeDefaults = {
  counterFiatRate: 1,
  destTokenDecimals: 6,
  executionType: LimitOrderExecutionType.SELL,
  isLimitFiatMode: false,
  limitPrice: '3000',
  sourceAmount: '2',
};

const buyTokenModeDefaults = {
  counterFiatRate: 1,
  destTokenDecimals: 18,
  executionType: LimitOrderExecutionType.BUY,
  isLimitFiatMode: false,
  limitPrice: '3000',
  sourceAmount: '6000',
};

describe('getSwapsLimitOrderDestTokenAmount', () => {
  describe('limit price denominated in a token', () => {
    it('multiplies the source amount by a sell price quoted in destination tokens, minus the quote fee', () => {
      const result = getSwapsLimitOrderDestTokenAmount(sellTokenModeDefaults);

      // 2 * 3000 = 6000, minus the 0.875% quote fee.
      expect(result).toBe('5947.5');
    });

    it('divides the source amount by a buy price quoted in source tokens, minus the quote fee', () => {
      const result = getSwapsLimitOrderDestTokenAmount(buyTokenModeDefaults);

      // 6000 / 3000 = 2, minus the 0.875% quote fee.
      expect(result).toBe('1.9825');
    });

    it('ignores the counter token fiat rate', () => {
      const result = getSwapsLimitOrderDestTokenAmount({
        ...sellTokenModeDefaults,
        counterFiatRate: 4321,
      });

      expect(result).toBe('5947.5');
    });
  });

  describe('limit price denominated in fiat', () => {
    it('converts a sell price in fiat through the live destination token price', () => {
      const result = getSwapsLimitOrderDestTokenAmount({
        counterFiatRate: 80000,
        destTokenDecimals: 8,
        executionType: LimitOrderExecutionType.SELL,
        isLimitFiatMode: true,
        limitPrice: '2400',
        sourceAmount: '1',
      });

      // 1 * 2400 / 80000 = 0.03, minus the 0.875% quote fee.
      expect(result).toBe('0.0297375');
    });

    it('converts a buy price in fiat through the live source token price', () => {
      const result = getSwapsLimitOrderDestTokenAmount({
        counterFiatRate: 2000,
        destTokenDecimals: 8,
        executionType: LimitOrderExecutionType.BUY,
        isLimitFiatMode: true,
        limitPrice: '80000',
        sourceAmount: '40',
      });

      // 40 / (80000 / 2000) = 1, minus the 0.875% quote fee.
      expect(result).toBe('0.99125');
    });

    it.each([
      { counterFiatRate: undefined },
      { counterFiatRate: 0 },
      { counterFiatRate: -1 },
    ])(
      'returns undefined when the counter token fiat rate is $counterFiatRate',
      ({ counterFiatRate }) => {
        const result = getSwapsLimitOrderDestTokenAmount({
          ...sellTokenModeDefaults,
          counterFiatRate,
          isLimitFiatMode: true,
        });

        expect(result).toBeUndefined();
      },
    );
  });

  describe('rounding', () => {
    it('rounds down to the destination token decimals', () => {
      const result = getSwapsLimitOrderDestTokenAmount({
        ...buyTokenModeDefaults,
        destTokenDecimals: 6,
        limitPrice: '3',
        sourceAmount: '1',
      });

      // (1 / 3) * (1 - 0.00875) = 0.33041666..., rounded down to 6 decimals.
      expect(result).toBe('0.330416');
    });

    it('returns zero when the amount rounds below the smallest destination unit', () => {
      const result = getSwapsLimitOrderDestTokenAmount({
        ...sellTokenModeDefaults,
        destTokenDecimals: 2,
        limitPrice: '0.001',
        sourceAmount: '1',
      });

      expect(result).toBe('0');
    });

    it('drops trailing zeros', () => {
      const result = getSwapsLimitOrderDestTokenAmount({
        ...sellTokenModeDefaults,
        limitPrice: '2.5',
        sourceAmount: '1',
      });

      // 1 * 2.5 * (1 - 0.00875) = 2.478125
      expect(result).toBe('2.478125');
    });
  });

  describe('quote fee', () => {
    it('reduces the destination amount by 0.875%', () => {
      const result = getSwapsLimitOrderDestTokenAmount({
        ...sellTokenModeDefaults,
        destTokenDecimals: 18,
        limitPrice: '1',
        sourceAmount: '1',
      });

      expect(result).toBe('0.99125');
    });
  });

  describe('amounts that produce no destination value', () => {
    it.each([
      { sourceAmount: undefined },
      { sourceAmount: '' },
      { sourceAmount: '0' },
      { sourceAmount: '-1' },
      { sourceAmount: 'abc' },
    ])(
      'returns zero when the source amount is $sourceAmount',
      ({ sourceAmount }) => {
        const result = getSwapsLimitOrderDestTokenAmount({
          ...sellTokenModeDefaults,
          sourceAmount,
        });

        expect(result).toBe('0');
      },
    );

    it.each([
      { limitPrice: undefined },
      { limitPrice: '' },
      { limitPrice: '0' },
      { limitPrice: '-1' },
      { limitPrice: 'abc' },
    ])(
      'returns undefined when the limit price is $limitPrice',
      ({ limitPrice }) => {
        const result = getSwapsLimitOrderDestTokenAmount({
          ...sellTokenModeDefaults,
          limitPrice,
        });

        expect(result).toBeUndefined();
      },
    );

    it('returns undefined when the destination token decimals are unavailable', () => {
      const result = getSwapsLimitOrderDestTokenAmount({
        ...sellTokenModeDefaults,
        destTokenDecimals: undefined,
      });

      expect(result).toBeUndefined();
    });
  });
});
