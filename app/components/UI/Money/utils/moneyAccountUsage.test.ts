import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  hasConfirmedMoneyDeposit,
  isPositiveMoneyBalance,
} from './moneyAccountUsage';

const moneyDeposit = (status: TransactionStatus) => ({
  type: TransactionType.moneyAccountDeposit,
  status,
});

describe('isPositiveMoneyBalance', () => {
  it.each([
    { balance: { value: '$12.34' }, expected: true },
    { balance: { value: '$2,384.34' }, expected: true },
    { balance: { value: '$0.00' }, expected: false },
    { balance: { value: '' }, expected: false },
    { balance: null, expected: false },
    { balance: undefined, expected: false },
    { balance: { value: 12.34 }, expected: false },
  ])('returns $expected for $balance', ({ balance, expected }) => {
    expect(isPositiveMoneyBalance(balance)).toBe(expected);
  });
});

describe('hasConfirmedMoneyDeposit', () => {
  it('returns true for a confirmed top-level Money deposit', () => {
    expect(
      hasConfirmedMoneyDeposit([moneyDeposit(TransactionStatus.confirmed)]),
    ).toBe(true);
  });

  it('returns true for a confirmed nested Money deposit', () => {
    expect(
      hasConfirmedMoneyDeposit([
        {
          type: 'batch',
          status: TransactionStatus.confirmed,
          nestedTransactions: [moneyDeposit(TransactionStatus.confirmed)],
        },
      ]),
    ).toBe(true);
  });

  it('returns false for a pending Money deposit', () => {
    expect(
      hasConfirmedMoneyDeposit([moneyDeposit(TransactionStatus.submitted)]),
    ).toBe(false);
  });

  it('returns false for unrelated or malformed transactions', () => {
    expect(hasConfirmedMoneyDeposit(undefined)).toBe(false);
    expect(hasConfirmedMoneyDeposit([])).toBe(false);
    expect(
      hasConfirmedMoneyDeposit([
        { type: 'simpleSend', status: TransactionStatus.confirmed },
        null,
        'invalid',
      ]),
    ).toBe(false);
  });
});
