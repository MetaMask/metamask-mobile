import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  hasConfirmedMoneyAccountTransaction,
  isPositiveMoneyBalance,
} from './moneyAccountUsage';

const moneyDeposit = (status: TransactionStatus) => ({
  type: TransactionType.moneyAccountDeposit,
  status,
});

const moneyWithdraw = (status: TransactionStatus) => ({
  type: TransactionType.moneyAccountWithdraw,
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

describe('hasConfirmedMoneyAccountTransaction', () => {
  it('returns true for a confirmed deposit or withdrawal', () => {
    expect(
      hasConfirmedMoneyAccountTransaction([
        moneyDeposit(TransactionStatus.confirmed),
      ]),
    ).toBe(true);
    expect(
      hasConfirmedMoneyAccountTransaction([
        moneyWithdraw(TransactionStatus.confirmed),
      ]),
    ).toBe(true);
    expect(
      hasConfirmedMoneyAccountTransaction([
        {
          type: 'batch',
          status: TransactionStatus.confirmed,
          nestedTransactions: [moneyWithdraw(TransactionStatus.confirmed)],
        },
      ]),
    ).toBe(true);
  });

  it('returns false for unconfirmed or unrelated transactions', () => {
    expect(
      hasConfirmedMoneyAccountTransaction([
        moneyDeposit(TransactionStatus.submitted),
      ]),
    ).toBe(false);
    expect(
      hasConfirmedMoneyAccountTransaction([
        moneyWithdraw(TransactionStatus.submitted),
      ]),
    ).toBe(false);
    expect(
      hasConfirmedMoneyAccountTransaction([
        { type: 'simpleSend', status: TransactionStatus.confirmed },
        null,
        'invalid',
      ]),
    ).toBe(false);
    expect(hasConfirmedMoneyAccountTransaction(undefined)).toBe(false);
    expect(hasConfirmedMoneyAccountTransaction([])).toBe(false);
  });
});
