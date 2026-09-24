import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { isUnconfirmedPerpsDepositOrder } from './perps-deposit-order';

describe('isUnconfirmedPerpsDepositOrder', () => {
  it('matches an unapproved perps deposit-and-order', () => {
    expect(
      isUnconfirmedPerpsDepositOrder({
        type: TransactionType.perpsDepositAndOrder,
        status: TransactionStatus.unapproved,
      }),
    ).toBe(true);
  });

  it('does not match once the user confirmed the trade', () => {
    expect(
      isUnconfirmedPerpsDepositOrder({
        type: TransactionType.perpsDepositAndOrder,
        status: TransactionStatus.submitted,
      }),
    ).toBe(false);
  });

  it('does not match a plain perps deposit awaiting confirmation', () => {
    expect(
      isUnconfirmedPerpsDepositOrder({
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.unapproved,
      }),
    ).toBe(false);
  });

  it('does not match an unapproved transaction of another type', () => {
    expect(
      isUnconfirmedPerpsDepositOrder({
        type: TransactionType.simpleSend,
        status: TransactionStatus.unapproved,
      }),
    ).toBe(false);
  });

  it('does not match a transaction with no type', () => {
    expect(
      isUnconfirmedPerpsDepositOrder({
        status: TransactionStatus.unapproved,
      }),
    ).toBe(false);
  });
});
