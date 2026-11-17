import type { PredictAmount } from '../../../types';
import {
  normalizeWithdrawAmount,
  sanitizeWithdrawAmount,
  withdrawAmountIssue,
} from './withdrawAmount';

const balance = (value: string) => value as PredictAmount;

describe('withdrawAmountIssue', () => {
  it.each([
    ['0.50', 'below_minimum'],
    ['0.99', 'below_minimum'],
    ['1.00', null],
    ['1.5', null],
  ] as const)('judges %s against the one dollar minimum', (amount, issue) => {
    expect(withdrawAmountIssue(amount)).toBe(issue);
  });

  it('accepts a trailing dot while decimals are typed', () => {
    expect(withdrawAmountIssue('10.')).toBeNull();
  });

  it('accepts a balance equal to the typed amount', () => {
    expect(withdrawAmountIssue('12.34', balance('12.34'))).toBeNull();
  });

  it('refuses a balance exceeded by one cent', () => {
    expect(withdrawAmountIssue('12.35', balance('12.34'))).toBe('over_balance');
  });

  it('compares money as integer cents, not floats', () => {
    expect(withdrawAmountIssue('1.30', balance('1.3'))).toBeNull();
    expect(withdrawAmountIssue('1.30', balance('1.29'))).toBe('over_balance');
  });

  it('judges a balance the venue reports with sub-cent dust', () => {
    expect(withdrawAmountIssue('493.59', balance('493.5900'))).toBeNull();
    expect(withdrawAmountIssue('493.60', balance('493.5900'))).toBe(
      'over_balance',
    );
  });

  it('treats an empty field as not yet an error', () => {
    expect(withdrawAmountIssue('', balance('0'))).toBeNull();
  });
});

describe('sanitizeWithdrawAmount', () => {
  it.each([
    ['00010', '10'],
    ['.5', '0.5'],
    ['10.', '10.'],
    ['10.555', '10.55'],
    ['1.2.3', '1.23'],
    ['abc', ''],
    ['12,00', '1200'],
  ])('keeps %s to a withdrawable shape as %s', (typed, kept) => {
    expect(sanitizeWithdrawAmount(typed)).toBe(kept);
  });
});

describe('normalizeWithdrawAmount', () => {
  it('drops the trailing dot before the amount is sent', () => {
    expect(normalizeWithdrawAmount('10.')).toBe('10');
  });

  it('leaves a complete amount unchanged', () => {
    expect(normalizeWithdrawAmount('10.50')).toBe('10.50');
  });
});
