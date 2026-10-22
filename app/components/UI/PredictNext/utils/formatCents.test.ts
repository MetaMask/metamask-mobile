import { formatCents } from './formatCents';
import type { PredictDecimal } from '../types';

const price = (value: string) => value as PredictDecimal;

describe('formatCents', () => {
  it('formats whole cents without decimals', () => {
    expect(formatCents(price('0.53'))).toBe('53¢');
    expect(formatCents(price('0.5'))).toBe('50¢');
    expect(formatCents(1)).toBe('100¢');
  });

  it('keeps one decimal for fractional cents', () => {
    expect(formatCents(price('0.4651'))).toBe('46.5¢');
    expect(formatCents(price('0.525'))).toBe('52.5¢');
  });

  it('rounds to one decimal precision', () => {
    expect(formatCents(price('0.5299'))).toBe('53¢');
  });

  it('formats zero', () => {
    expect(formatCents(price('0'))).toBe('0¢');
  });

  it('falls back to 0¢ for non-numeric input', () => {
    expect(formatCents('not-a-price' as PredictDecimal)).toBe('0¢');
  });
});
