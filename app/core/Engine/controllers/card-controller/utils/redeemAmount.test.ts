import { capRedeemAmount } from './redeemAmount';

describe('capRedeemAmount', () => {
  it('floors the reported reward-endpoint balance to 4 decimals', () => {
    expect(capRedeemAmount('17.96660759')).toBe('17.9666');
  });

  it('leaves an amount already at 4 decimals unchanged', () => {
    expect(capRedeemAmount('10.1234')).toBe('10.1234');
  });

  it('floors rather than rounds when the next digit is ≥ 5', () => {
    expect(capRedeemAmount('1.12345')).toBe('1.1234');
    expect(capRedeemAmount('0.99999')).toBe('0.9999');
  });

  it('returns 0 for dust below the 4-decimal floor', () => {
    expect(capRedeemAmount('0.00009')).toBe('0');
  });

  it('normalizes redundant trailing zeros beyond 4 decimals', () => {
    expect(capRedeemAmount('1.10000')).toBe('1.1');
  });

  it('preserves in-range strings byte-identical', () => {
    expect(capRedeemAmount('10.00')).toBe('10.00');
    expect(capRedeemAmount('0.0007')).toBe('0.0007');
  });

  it('strips commas and floors comma-formatted excess precision', () => {
    expect(capRedeemAmount('1,000.12345')).toBe('1000.1234');
  });

  it('avoids exponential notation on very large values', () => {
    expect(capRedeemAmount('1000000000.123456')).toBe('1000000000.1234');
  });

  it.each([
    ['invalid', 'invalid'],
    ['empty string', ''],
    ['undefined', undefined],
    ['Infinity', Infinity],
    ['negative', '-1.2345'],
    ['zero', '0'],
    ['negative zero', '-0'],
  ])('returns 0 for %s', (_label, value) => {
    expect(capRedeemAmount(value as string | number)).toBe('0');
  });

  it('accepts a number input with excess precision', () => {
    expect(capRedeemAmount(10.12345)).toBe('10.1234');
  });

  it('does not leak scientific notation from number inputs', () => {
    expect(capRedeemAmount(1e-7)).toBe('0');
    expect(capRedeemAmount(1e-6)).toBe('0');
    expect(capRedeemAmount(1e21)).toBe('1000000000000000000000');
  });

  it('does not leak scientific notation from string inputs', () => {
    expect(capRedeemAmount('1e-7')).toBe('0');
    expect(capRedeemAmount('1E-6')).toBe('0');
    expect(capRedeemAmount('1.23456e2')).toBe('123.456');
  });
});
