import { TransactionType } from '@metamask/transaction-controller';
import {
  beginUnclaimedPrewarmTransaction,
  dropUnclaimedPrewarmTransaction,
  endUnclaimedPrewarmTransaction,
  isUnclaimedPrewarmTransaction,
  releaseAllStashedPrewarmTransactionAdded,
  resetUnclaimedPrewarmTransactionMetricsForTesting,
  retainOnlyUnclaimedPrewarmTransaction,
  stashUnclaimedPrewarmTransactionAdded,
  suppressUnclaimedPrewarmTransactionAdded,
  trackStashedPrewarmTransactionAdded,
} from './unclaimedPrewarmTransactionMetrics';

describe('unclaimed prewarm transaction metrics', () => {
  beforeEach(() => {
    resetUnclaimedPrewarmTransactionMetricsForTesting();
  });

  it('holds back a perpsDepositAndOrder inserted while a prewarm is being created', () => {
    beginUnclaimedPrewarmTransaction();

    expect(
      suppressUnclaimedPrewarmTransactionAdded({
        id: 'prewarm-tx',
        type: TransactionType.perpsDepositAndOrder,
      }),
    ).toBe(true);
    expect(isUnclaimedPrewarmTransaction('prewarm-tx')).toBe(true);
  });

  it('does not hold back other transaction types or inserts outside a prewarm', () => {
    beginUnclaimedPrewarmTransaction();

    expect(
      suppressUnclaimedPrewarmTransactionAdded({
        id: 'swap-tx',
        type: TransactionType.swap,
      }),
    ).toBe(false);

    endUnclaimedPrewarmTransaction();

    expect(
      suppressUnclaimedPrewarmTransactionAdded({
        id: 'later-tx',
        type: TransactionType.perpsDepositAndOrder,
      }),
    ).toBe(false);
    expect(isUnclaimedPrewarmTransaction('later-tx')).toBe(false);
  });

  it('emits only the transactions that were not the prepared prewarm', () => {
    beginUnclaimedPrewarmTransaction();
    const emitted: string[] = [];
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'prewarm-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'user-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('prewarm-tx', () => {
      emitted.push('prewarm-tx');
    });
    stashUnclaimedPrewarmTransactionAdded('user-tx', () => {
      emitted.push('user-tx');
    });

    retainOnlyUnclaimedPrewarmTransaction('prewarm-tx');

    expect(emitted).toEqual(['user-tx']);
    expect(isUnclaimedPrewarmTransaction('prewarm-tx')).toBe(true);
    expect(isUnclaimedPrewarmTransaction('user-tx')).toBe(false);
  });

  it('emits Transaction Added on claim and then counts a rejection', () => {
    beginUnclaimedPrewarmTransaction();
    const emitted: string[] = [];
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'prewarm-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('prewarm-tx', () => {
      emitted.push('prewarm-tx');
    });

    trackStashedPrewarmTransactionAdded('prewarm-tx');

    expect(emitted).toEqual(['prewarm-tx']);
    expect(isUnclaimedPrewarmTransaction('prewarm-tx')).toBe(false);
  });

  it('drops a rejected prewarm without emitting Transaction Added', () => {
    beginUnclaimedPrewarmTransaction();
    const emitted: string[] = [];
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'prewarm-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('prewarm-tx', () => {
      emitted.push('prewarm-tx');
    });

    dropUnclaimedPrewarmTransaction('prewarm-tx');

    expect(emitted).toEqual([]);
    expect(isUnclaimedPrewarmTransaction('prewarm-tx')).toBe(false);
  });

  it('releases every held-back insert when prewarm creation fails', () => {
    beginUnclaimedPrewarmTransaction();
    const emitted: string[] = [];
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'user-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('user-tx', () => {
      emitted.push('user-tx');
    });

    releaseAllStashedPrewarmTransactionAdded();

    expect(emitted).toEqual(['user-tx']);
    expect(isUnclaimedPrewarmTransaction('user-tx')).toBe(false);
  });
});
