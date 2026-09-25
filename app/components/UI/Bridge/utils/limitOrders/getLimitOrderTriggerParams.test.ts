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

  it('prices the pair as a ratio when the limit is quoted in counter token units', () => {
    const options = createOptions({
      isLimitFiatMode: false,
      limitPrice: '0.0400',
    });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger).toStrictEqual({
      kind: 'ratio',
      threshold: 'above',
      price: '0.04',
    });
  });

  it('converts a fiat limit price to its USD equivalent', () => {
    // 1 EUR is worth 1.08 USD, so a EUR 100 limit triggers at USD 108.
    const options = createOptions({ limitPrice: '100', fiatToUsdRate: 1.08 });

    const trigger = getLimitOrderTriggerParams(options);

    expect(trigger?.price).toBe('108');
  });

  it('leaves a ratio price unconverted whatever the display currency is worth', () => {
    const options = createOptions({
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
