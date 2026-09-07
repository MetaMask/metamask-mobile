import type { PredictDecimal } from '../types';
import {
  formatProbabilityChange,
  roundProbabilityToWhole,
} from './formatProbability';

describe('formatProbability', () => {
  it('rounds a decimal probability without floating-point drift', () => {
    expect(roundProbabilityToWhole('0.285' as PredictDecimal)).toBe('29');
  });

  it('rounds a decimal probability change without floating-point drift', () => {
    expect(
      formatProbabilityChange(
        '0.100' as PredictDecimal,
        '0.145' as PredictDecimal,
      ),
    ).toBe('+5 pts');
  });

  it('formats a negative probability change', () => {
    expect(
      formatProbabilityChange(
        '0.145' as PredictDecimal,
        '0.100' as PredictDecimal,
      ),
    ).toBe('-5 pts');
  });
});
