import { TransactionType } from '@metamask/transaction-controller';
import {
  FULL_SCREEN_CONFIRMATIONS,
  POST_QUOTE_TRANSACTION_TYPES,
  REDESIGNED_TRANSACTION_TYPES,
} from './confirmations';

describe('confirmation constants', () => {
  it('includes perps withdraw in full-screen confirmations', () => {
    expect(FULL_SCREEN_CONFIRMATIONS).toContain(TransactionType.perpsWithdraw);
  });

  it('includes perps withdraw in post-quote transaction types', () => {
    expect(POST_QUOTE_TRANSACTION_TYPES).toContain(
      TransactionType.perpsWithdraw,
    );
  });

  it('does not include perps withdraw in redesigned transaction types (uses FULL_SCREEN_CONFIRMATIONS instead)', () => {
    expect(REDESIGNED_TRANSACTION_TYPES).not.toContain(
      TransactionType.perpsWithdraw,
    );
  });
});
