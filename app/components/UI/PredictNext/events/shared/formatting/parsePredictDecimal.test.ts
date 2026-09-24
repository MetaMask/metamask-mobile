import { parsePredictDecimal } from './parsePredictDecimal';

describe('parsePredictDecimal', () => {
  it('parses a decimal string', () => {
    const result = parsePredictDecimal('0.42');

    expect(result?.toString()).toBe('0.42');
  });

  it('preserves a tenth without binary float artifacts', () => {
    const result = parsePredictDecimal('0.1');

    expect(result?.toString()).toBe('0.1');
  });

  it('multiplies a decimal that is not an exact binary float', () => {
    const result = parsePredictDecimal('0.58');

    expect(result?.times(100).toString()).toBe('58');
  });

  it('omits a missing value', () => {
    const result = parsePredictDecimal();

    expect(result).toBeUndefined();
  });

  it('omits a non-finite value', () => {
    const result = parsePredictDecimal('Infinity');

    expect(result).toBeUndefined();
  });
});
