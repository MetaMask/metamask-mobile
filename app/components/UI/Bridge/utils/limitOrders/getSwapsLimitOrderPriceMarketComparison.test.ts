import { strings } from '../../../../../../locales/i18n';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
import { getSwapsLimitOrderPriceMarketComparison } from './getSwapsLimitOrderPriceMarketComparison';

const THRESHOLD = 3;

describe('getSwapsLimitOrderPriceMarketComparison', () => {
  describe('returns undefined for invalid inputs', () => {
    it.each([
      {
        limitFiat: undefined,
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
      },
      {
        limitFiat: '100',
        marketFiat: undefined,
        executionType: LimitOrderExecutionType.SELL,
      },
      {
        limitFiat: '0',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
      },
      {
        limitFiat: '100',
        marketFiat: 0,
        executionType: LimitOrderExecutionType.SELL,
      },
      {
        limitFiat: 'invalid',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
      },
    ])(
      'returns undefined for limitFiat=$limitFiat marketFiat=$marketFiat',
      ({ limitFiat, marketFiat, executionType }) => {
        const result = getSwapsLimitOrderPriceMarketComparison({
          limitFiat,
          marketFiat,
          executionType,
          threshold: THRESHOLD,
        });

        expect(result).toBeUndefined();
      },
    );
  });

  describe('sell execution type', () => {
    it('returns undefined when limit is within the threshold above market', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '102',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
        threshold: THRESHOLD,
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when limit equals threshold percent above market', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '103',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
        threshold: THRESHOLD,
      });

      expect(result).toBeUndefined();
    });

    it('returns above-market label when limit exceeds threshold percent above market', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '104',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.SELL,
        threshold: THRESHOLD,
      });

      expect(result).toEqual({
        label: strings('bridge.limit.from_market_above', {
          percent: '4.00',
        }),
        isNegative: false,
      });
    });
  });

  describe('buy execution type', () => {
    it('returns undefined when limit is within the threshold below market', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '97.1',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.BUY,
        threshold: THRESHOLD,
      });

      expect(result).toBeUndefined();
    });

    it('returns below-market label when limit is at threshold percent below market', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '97',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.BUY,
        threshold: THRESHOLD,
      });

      expect(result).toEqual({
        label: strings('bridge.limit.from_market', {
          percent: '3.00',
        }),
        isNegative: true,
      });
    });

    it('returns below-market label when limit exceeds threshold percent below market', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '90',
        marketFiat: 100,
        executionType: LimitOrderExecutionType.BUY,
        threshold: THRESHOLD,
      });

      expect(result).toEqual({
        label: strings('bridge.limit.from_market', {
          percent: '10.00',
        }),
        isNegative: true,
      });
    });
  });
});
