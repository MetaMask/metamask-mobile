import {
  formatUsdcBalance,
  isCompleteDepositAmount,
  meetsDepositMinimum,
  sanitizeDepositInput,
  toDepositAmount,
} from './depositAmount';

describe('sanitizeDepositInput', () => {
  it.each([
    ['25', '25'],
    ['025', '25'],
    ['.', '0.'],
    ['1.234', '1.23'],
    ['1..2', '1.2'],
    ['1234567890', '123456789'],
    ['12a', '12'],
  ])('reads %p as %p', (input, expected) => {
    expect(sanitizeDepositInput(input)).toBe(expected);
  });
});

describe('isCompleteDepositAmount', () => {
  it.each([
    ['25', true],
    ['25.5', true],
    ['25.50', true],
    ['25.', false],
    ['', false],
  ])('answers %p for %p', (input, expected) => {
    expect(isCompleteDepositAmount(input)).toBe(expected);
  });
});

describe('meetsDepositMinimum', () => {
  it.each([
    ['1', true],
    ['1.00', true],
    ['0.99', false],
    ['1.', false],
    ['1000000', true],
  ])('answers %p for %p', (input, expected) => {
    expect(meetsDepositMinimum(input)).toBe(expected);
  });
});

describe('toDepositAmount', () => {
  it.each([
    ['25', '25.00'],
    ['25.5', '25.50'],
    ['25.55', '25.55'],
  ])('sends %p as %p', (input, expected) => {
    expect(toDepositAmount(input)).toBe(expected);
  });
});

describe('formatUsdcBalance', () => {
  it.each([
    [BigInt(0), '0.00'],
    [BigInt(25_000_000), '25.00'],
    [BigInt(1_234_567_891), '1,234.56'],
    [BigInt(9_999), '0.00'],
  ])('shows %p base units as %p, rounded down', (baseUnits, expected) => {
    expect(formatUsdcBalance(baseUnits)).toBe(expected);
  });
});
