import type { PredictDecimal } from '../../types';
import { formatMultiplier } from './formatMultiplier';

describe('formatMultiplier', () => {
  it('formats a multiplier from an Ask Price', () => {
    const result = formatMultiplier('0.42' as PredictDecimal);

    expect(result).toBe('2.38x');
  });

  it('formats a large multiplier with one decimal', () => {
    const result = formatMultiplier('0.08' as PredictDecimal);

    expect(result).toBe('12.5x');
  });

  it('omits a missing Ask Price', () => {
    const result = formatMultiplier();

    expect(result).toBeUndefined();
  });

  it('omits a zero Ask Price', () => {
    const result = formatMultiplier('0' as PredictDecimal);

    expect(result).toBeUndefined();
  });
});
