import type { PredictDecimal } from '../../../types';
import { formatAskPricePercent } from './formatAskPricePercent';

describe('formatAskPricePercent', () => {
  it('formats an Ask Price as a percentage', () => {
    const result = formatAskPricePercent('0.42' as PredictDecimal);

    expect(result).toBe('42%');
  });

  it('formats an Ask Price that is not an exact binary float', () => {
    const result = formatAskPricePercent('0.58' as PredictDecimal);

    expect(result).toBe('58%');
  });

  it('displays a zero Ask Price', () => {
    const result = formatAskPricePercent('0' as PredictDecimal);

    expect(result).toBe('0%');
  });

  it('rounds an Ask Price to the nearest whole percent', () => {
    const result = formatAskPricePercent('0.285' as PredictDecimal);

    expect(result).toBe('29%');
  });

  it('caps an Ask Price above 1 at 100%', () => {
    const result = formatAskPricePercent('1.5' as PredictDecimal);

    expect(result).toBe('100%');
  });

  it('omits a missing Ask Price', () => {
    const result = formatAskPricePercent();

    expect(result).toBeUndefined();
  });

  it('omits a negative Ask Price', () => {
    const result = formatAskPricePercent('-0.42' as PredictDecimal);

    expect(result).toBeUndefined();
  });
});
