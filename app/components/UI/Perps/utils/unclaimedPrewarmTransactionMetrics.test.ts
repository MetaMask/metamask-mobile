import { TransactionType } from '@metamask/transaction-controller';
import {
  beginUnclaimedPrewarmTransaction,
  dropAllUnclaimedPrewarmTransactions,
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
    const generation = beginUnclaimedPrewarmTransaction();

    expect(
      suppressUnclaimedPrewarmTransactionAdded({
        id: 'swap-tx',
        type: TransactionType.swap,
      }),
    ).toBe(false);

    endUnclaimedPrewarmTransaction(generation);

    expect(
      suppressUnclaimedPrewarmTransactionAdded({
        id: 'later-tx',
        type: TransactionType.perpsDepositAndOrder,
      }),
    ).toBe(false);
    expect(isUnclaimedPrewarmTransaction('later-tx')).toBe(false);
  });

  it('emits only the transactions that were not the prepared prewarm', () => {
    const generation = beginUnclaimedPrewarmTransaction();
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

    retainOnlyUnclaimedPrewarmTransaction(generation, 'prewarm-tx');

    expect(emitted).toEqual(['user-tx']);
    expect(isUnclaimedPrewarmTransaction('prewarm-tx')).toBe(true);
    expect(isUnclaimedPrewarmTransaction('user-tx')).toBe(false);
  });

  it('keeps a later prewarm stashed when an earlier prewarm settles', () => {
    const earlier = beginUnclaimedPrewarmTransaction();
    const emitted: string[] = [];
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'earlier-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('earlier-tx', () => {
      emitted.push('earlier-tx');
    });
    const later = beginUnclaimedPrewarmTransaction();
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'later-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('later-tx', () => {
      emitted.push('later-tx');
    });

    retainOnlyUnclaimedPrewarmTransaction(earlier, 'earlier-tx');
    endUnclaimedPrewarmTransaction(earlier);

    expect(emitted).toEqual([]);
    expect(isUnclaimedPrewarmTransaction('earlier-tx')).toBe(true);
    expect(isUnclaimedPrewarmTransaction('later-tx')).toBe(true);

    retainOnlyUnclaimedPrewarmTransaction(later, 'later-tx');

    expect(emitted).toEqual([]);
    expect(isUnclaimedPrewarmTransaction('later-tx')).toBe(true);
  });

  it('drops only the failed prewarm while a later prewarm is in flight', () => {
    const earlier = beginUnclaimedPrewarmTransaction();
    const emitted: string[] = [];
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'earlier-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('earlier-tx', () => {
      emitted.push('earlier-tx');
    });
    beginUnclaimedPrewarmTransaction();
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'later-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('later-tx', () => {
      emitted.push('later-tx');
    });

    dropAllUnclaimedPrewarmTransactions(earlier);

    expect(emitted).toEqual([]);
    expect(isUnclaimedPrewarmTransaction('earlier-tx')).toBe(false);
    expect(isUnclaimedPrewarmTransaction('later-tx')).toBe(true);
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
    const generation = beginUnclaimedPrewarmTransaction();
    const emitted: string[] = [];
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'user-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('user-tx', () => {
      emitted.push('user-tx');
    });

    releaseAllStashedPrewarmTransactionAdded(generation);

    expect(emitted).toEqual(['user-tx']);
    expect(isUnclaimedPrewarmTransaction('user-tx')).toBe(false);
  });

  it('releases a transaction held by the failed prewarm alone and keeps the later prewarm', () => {
    const earlier = beginUnclaimedPrewarmTransaction();
    const emitted: string[] = [];
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'user-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('user-tx', () => {
      emitted.push('user-tx');
    });
    beginUnclaimedPrewarmTransaction();
    suppressUnclaimedPrewarmTransactionAdded({
      id: 'later-tx',
      type: TransactionType.perpsDepositAndOrder,
    });
    stashUnclaimedPrewarmTransactionAdded('later-tx', () => {
      emitted.push('later-tx');
    });

    releaseAllStashedPrewarmTransactionAdded(earlier);

    expect(emitted).toEqual(['user-tx']);
    expect(isUnclaimedPrewarmTransaction('later-tx')).toBe(true);
  });
});
