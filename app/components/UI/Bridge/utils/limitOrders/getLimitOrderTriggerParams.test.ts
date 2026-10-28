import {
  LimitOrderExecutionType,
  LimitOrderPriceComparisonDirection,
} from '../../constants/limitOrders';
import { getLimitOrderTriggerParams } from './getLimitOrderTriggerParams';

const createOptions = (overrides = {}) => ({
  executionType: LimitOrderExecutionType.SELL,
  isLimitFiatMode: true,
  limitPrice: '3412.2',
  priceComparisonDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
  fiatToUsdRate: 1,
  ...overrides,
});

describe('getLimitOrderTriggerParams', () => {
  it('prices the source asset when the limit is quoted in fiat on the sell side', () => {
    const options = createOptions({
      executionType: LimitOrderExecutionType.SELL,
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toStrictEqual({
      kind: 'src_price',
      threshold: 'above',
      price: '3412.2',
    });
  });

  it('prices the destination asset when the limit is quoted in fiat on the buy side', () => {
    const options = createOptions({
      executionType: LimitOrderExecutionType.BUY,
      priceComparisonDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toStrictEqual({
      kind: 'dest_price',
      threshold: 'below',
      price: '3412.2',
    });
  });

  it('sends a buy ratio as entered, since it is already source tokens per destination token', () => {
    // Buy 1 ETH when it is at or below 20000 USDC on a USDC to ETH order.
    const options = createOptions({
      executionType: LimitOrderExecutionType.BUY,
      isLimitFiatMode: false,
      limitPrice: '20000.00',
      priceComparisonDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toStrictEqual({
      kind: 'ratio',
      threshold: 'below',
      price: '20000',
    });
  });

  it('inverts a sell ratio and its threshold into source tokens per destination token', () => {
    // Sell 1 ETH when it is at or below 5 USDC on an ETH to USDC order, i.e.
    // when 1 USDC costs at least 0.2 ETH.
    const options = createOptions({
      executionType: LimitOrderExecutionType.SELL,
      isLimitFiatMode: false,
      limitPrice: '5',
      priceComparisonDirection: LimitOrderPriceComparisonDirection.AT_OR_BELOW,
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toStrictEqual({
      kind: 'ratio',
      threshold: 'above',
      price: '0.2',
    });
  });

  it('flips an at or above sell ratio to below once inverted', () => {
    const options = createOptions({
      executionType: LimitOrderExecutionType.SELL,
      isLimitFiatMode: false,
      limitPrice: '0.0400',
      priceComparisonDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toStrictEqual({
      kind: 'ratio',
      threshold: 'below',
      price: '25',
    });
  });

  it('rounds an inverted sell ratio to the 12 decimals the API keeps', () => {
    const options = createOptions({
      isLimitFiatMode: false,
      limitPrice: '3',
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger?.price).toBe('0.333333333333');
  });

  it('returns undefined for a sell ratio whose inverse is too small for the API', () => {
    const options = createOptions({
      isLimitFiatMode: false,
      limitPrice: '10000000000000',
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toBeUndefined();
  });

  it('converts a fiat limit price to its USD equivalent', () => {
    // 1 EUR is worth 1.08 USD, so a EUR 100 limit triggers at USD 108.
    const options = createOptions({ limitPrice: '100', fiatToUsdRate: 1.08 });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger?.price).toBe('108');
  });

  it('leaves a ratio price unconverted whatever the display currency is worth', () => {
    const options = createOptions({
      executionType: LimitOrderExecutionType.BUY,
      isLimitFiatMode: false,
      limitPrice: '0.04',
      fiatToUsdRate: 1.08,
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger?.price).toBe('0.04');
  });

  it('returns undefined for a fiat price when the USD rate is unavailable', () => {
    const options = createOptions({ fiatToUsdRate: undefined });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toBeUndefined();
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['zero', '0'],
    ['negative', '-1'],
    ['non-numeric', 'abc'],
  ])('returns undefined for a %s limit price', (_label, limitPrice) => {
    const options = createOptions({ limitPrice });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toBeUndefined();
  });
});
