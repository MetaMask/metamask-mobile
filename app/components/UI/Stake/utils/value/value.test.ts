import bn from 'bignumber.js';
import { fixDisplayAmount, isEqualOrGreaterOrderOfMagnitude } from './index';

describe('fixDisplayAmount', () => {
  it('handles different input formats and returns a string', () => {
    expect(fixDisplayAmount(5)).toBe('5.00');
    expect(fixDisplayAmount('5')).toBe('5.00');
    expect(fixDisplayAmount(new bn(5))).toBe('5.00');
  });
  it('rounds number to 4 decimals when decimals is set to 4', () => {
    expect(fixDisplayAmount(5.45446, 4)).toBe('5.4544');
    expect(fixDisplayAmount('5.45446', 4)).toBe('5.4544');
    expect(fixDisplayAmount(new bn(5.45446), 4)).toBe('5.4544');
  });
  it('fixes decimals regardless of trailing zeroes', () => {
    expect(fixDisplayAmount('5.40000', 2)).toBe('5.40');
    expect(fixDisplayAmount(new bn('5.40000'), 2)).toBe('5.40');
  });
  it('fixes exponential decimals in scientific notation when input is over default evaluated exponent', () => {
    expect(fixDisplayAmount(1000000000000000000000, 2)).toBe('1.00e+21');
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(fixDisplayAmount(1234567891234567891234, 2)).toBe('1.23e+21');
    expect(fixDisplayAmount('1234567891234567891234', 2)).toBe('1.23e+21');
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(fixDisplayAmount(new bn(1234567891234567891234), 2)).toBe(
      '1.23e+21',
    );
  });
  it('fixes exponential decimals in scientific notation when input is over custom evaluated exponent', () => {
    expect(fixDisplayAmount(100000, 2, 5)).toBe('1.00e+5');
    expect(fixDisplayAmount(123456, 2, 5)).toBe('1.23e+5');
    expect(fixDisplayAmount('123456', 2, 5)).toBe('1.23e+5');
    expect(fixDisplayAmount(new bn(123456), 2, 5)).toBe('1.23e+5');
  });
  it('fixes decimals in scientific notation when decimal input is below 1 but over default inverse evaluated exponent', () => {
    expect(fixDisplayAmount(0.123, 2)).toBe('0.12');
    expect(fixDisplayAmount('0.123', 2)).toBe('0.12');
    expect(fixDisplayAmount(new bn(0.123), 2)).toBe('0.12');
  });
  it('fixes exponential decimals in scientific notation when decimal input is under custom inverse evaluated exponent', () => {
    expect(fixDisplayAmount(0.001, 2, 3)).toBe('1.00e-3');
    expect(fixDisplayAmount(0.0001234, 2, 3)).toBe('1.23e-4');
    expect(fixDisplayAmount('0.0001234', 2, 3)).toBe('1.23e-4');
    expect(fixDisplayAmount(new bn(0.0001234), 2, 3)).toBe('1.23e-4');
  });
  it('defaults to rounding down', () => {
    expect(fixDisplayAmount('210.626398728671935147', 4, undefined)).toBe(
      '210.6263',
    );
  });
  it('obeys a passed rounding instruction', () => {
    expect(
      fixDisplayAmount(
        '210.626398728671935147',
        4,
        undefined,
        bn.ROUND_HALF_UP,
      ),
    ).toBe('210.6264');
  });
});

describe('isEqualOrGreaterOrderOfMagnitude', () => {
  it('returns true when value is larger than evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(1000), 2)).toBe(true);
  });
  it('returns true when value is same order of magnitude to evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(100), 2)).toBe(true);
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(0.01), 2)).toBe(true);
  });
  it('returns true when value is smaller than inverse evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(0.001), 2)).toBe(true);
  });
  it('returns false when value is 1 or larger but smaller than evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(1), 2)).toBe(false);
  });
  it('returns false when value is smaller than 1 but larger than inverse evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(0.1), 2)).toBe(false);
  });
});
