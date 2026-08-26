import type { PredictDecimal } from '../../../types';
import { getAskPricePercent } from './getAskPricePercent';

describe('getAskPricePercent', () => {
  it('converts an Ask Price to a percent', () => {
    const result = getAskPricePercent('0.42' as PredictDecimal);

    expect(result).toBe(42);
  });

  it('converts an Ask Price that is not an exact binary float', () => {
    const result = getAskPricePercent('0.58' as PredictDecimal);

    expect(result).toBe(58);
  });

  it('caps the percent at 100', () => {
    const result = getAskPricePercent('1.5' as PredictDecimal);

    expect(result).toBe(100);
  });

  it('returns 0 for a zero Ask Price', () => {
    const result = getAskPricePercent('0' as PredictDecimal);

    expect(result).toBe(0);
  });

  it('omits a missing Ask Price', () => {
    const result = getAskPricePercent();

    expect(result).toBeUndefined();
  });

  it('omits a negative Ask Price', () => {
    const result = getAskPricePercent('-0.42' as PredictDecimal);

    expect(result).toBeUndefined();
  });
});
