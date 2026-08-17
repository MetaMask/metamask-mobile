import type { PredictDecimal } from '../../types';
import { formatAskPrice } from './formatAskPrice';

describe('formatAskPrice', () => {
  it('formats an Ask Price as cents', () => {
    const result = formatAskPrice('0.42' as PredictDecimal);

    expect(result).toBe('42¢');
  });

  it('displays a zero Ask Price', () => {
    const result = formatAskPrice('0' as PredictDecimal);

    expect(result).toBe('0¢');
  });

  it('rounds an Ask Price without floating-point drift', () => {
    const result = formatAskPrice('0.285' as PredictDecimal);

    expect(result).toBe('29¢');
  });

  it('omits a missing Ask Price', () => {
    const result = formatAskPrice();

    expect(result).toBeUndefined();
  });
});
