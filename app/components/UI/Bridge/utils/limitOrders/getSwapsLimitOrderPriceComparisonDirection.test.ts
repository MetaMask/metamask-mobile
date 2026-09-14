import {
  LimitOrderExecutionType,
  LimitOrderPriceComparisonDirection,
} from '../../constants/limitOrders';
import {
  getSwapsLimitOrderDefaultPriceComparisonDirection,
  getSwapsLimitOrderPriceComparisonDirection,
} from './getSwapsLimitOrderPriceComparisonDirection';

describe('getSwapsLimitOrderDefaultPriceComparisonDirection', () => {
  it('reads as at or above for sells', () => {
    expect(
      getSwapsLimitOrderDefaultPriceComparisonDirection(
        LimitOrderExecutionType.SELL,
      ),
    ).toBe(LimitOrderPriceComparisonDirection.AT_OR_ABOVE);
  });

  it('reads as at or below for buys', () => {
    expect(
      getSwapsLimitOrderDefaultPriceComparisonDirection(
        LimitOrderExecutionType.BUY,
      ),
    ).toBe(LimitOrderPriceComparisonDirection.AT_OR_BELOW);
  });
});

describe('getSwapsLimitOrderPriceComparisonDirection', () => {
  describe('buy orders', () => {
    it('reads as at or above when the limit price is above market', () => {
      const result = getSwapsLimitOrderPriceComparisonDirection({
        limitFiat: '101',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.BUY,
      });

      expect(result).toBe(LimitOrderPriceComparisonDirection.AT_OR_ABOVE);
    });

    it('reads as at or below when the limit price is below market', () => {
      const result = getSwapsLimitOrderPriceComparisonDirection({
        limitFiat: '99',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.BUY,
      });

      expect(result).toBe(LimitOrderPriceComparisonDirection.AT_OR_BELOW);
    });

    it('keeps the side default when the limit price equals market', () => {
      const result = getSwapsLimitOrderPriceComparisonDirection({
        limitFiat: '100',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.BUY,
      });

      expect(result).toBe(LimitOrderPriceComparisonDirection.AT_OR_BELOW);
    });
  });

  describe('sell orders', () => {
    it('reads as at or below when the limit price is below market', () => {
      const result = getSwapsLimitOrderPriceComparisonDirection({
        limitFiat: '99',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
      });

      expect(result).toBe(LimitOrderPriceComparisonDirection.AT_OR_BELOW);
    });

    it('reads as at or above when the limit price is above market', () => {
      const result = getSwapsLimitOrderPriceComparisonDirection({
        limitFiat: '101',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
      });

      expect(result).toBe(LimitOrderPriceComparisonDirection.AT_OR_ABOVE);
    });

    it('keeps the side default when the limit price equals market', () => {
      const result = getSwapsLimitOrderPriceComparisonDirection({
        limitFiat: '100',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
      });

      expect(result).toBe(LimitOrderPriceComparisonDirection.AT_OR_ABOVE);
    });
  });

  describe('keeps the side default for unusable inputs', () => {
    it.each([
      { limitFiat: undefined, marketFiat: 100 },
      { limitFiat: '', marketFiat: 100 },
      { limitFiat: '0', marketFiat: 100 },
      { limitFiat: '-1', marketFiat: 100 },
      { limitFiat: 'invalid', marketFiat: 100 },
      { limitFiat: '99', marketFiat: undefined },
      { limitFiat: '99', marketFiat: 0 },
      { limitFiat: '99', marketFiat: -1 },
    ])(
      'keeps at or above for a sell with limitFiat=$limitFiat marketFiat=$marketFiat',
      ({ limitFiat, marketFiat }) => {
        const result = getSwapsLimitOrderPriceComparisonDirection({
          limitFiat,
          marketFiat,
          executionType: LimitOrderExecutionType.SELL,
        });

        expect(result).toBe(LimitOrderPriceComparisonDirection.AT_OR_ABOVE);
      },
    );
  });

  it('compares with decimal precision rather than float arithmetic', () => {
    const result = getSwapsLimitOrderPriceComparisonDirection({
      limitFiat: '0.1',
      marketFiat: 0.1,
      executionType: LimitOrderExecutionType.BUY,
    });

    expect(result).toBe(LimitOrderPriceComparisonDirection.AT_OR_BELOW);
  });
});
