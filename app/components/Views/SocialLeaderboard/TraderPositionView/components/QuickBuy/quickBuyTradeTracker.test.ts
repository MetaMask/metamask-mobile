import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  beginQuickBuySubmission,
  clearSettledQuickBuyTrades,
  endQuickBuySubmission,
  getTrackedQuickBuyTrade,
  getTrackedQuickBuyTradeIds,
  hasPendingQuickBuySubmission,
  isQuickBuyTransaction,
  markQuickBuyTradeSettled,
  trackQuickBuyTrade,
  untrackQuickBuyTrade,
  type TrackedQuickBuyTrade,
} from './quickBuyTradeTracker';

const txMeta = (overrides: Partial<TransactionMeta>): TransactionMeta =>
  overrides as TransactionMeta;

const buyTrade: TrackedQuickBuyTrade = {
  tradeMode: 'buy',
  tokenSymbol: 'PEPE',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$50.00',
  rate: '1 USDC = 1,000 PEPE',
};

const sellTrade: TrackedQuickBuyTrade = {
  tradeMode: 'sell',
  tokenSymbol: 'DOGE',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$25.00',
};

describe('quickBuyTradeTracker', () => {
  afterEach(() => {
    getTrackedQuickBuyTradeIds().forEach(untrackQuickBuyTrade);
    clearSettledQuickBuyTrades();
    while (hasPendingQuickBuySubmission()) {
      endQuickBuySubmission();
    }
  });

  it('stores and returns a tracked trade by tx meta id', () => {
    trackQuickBuyTrade('tx-1', buyTrade);

    expect(getTrackedQuickBuyTrade('tx-1')).toEqual(buyTrade);
  });

  it('returns undefined for an unknown tx meta id', () => {
    expect(getTrackedQuickBuyTrade('missing')).toBeUndefined();
  });

  it('returns the same empty array reference when nothing is tracked', () => {
    const first = getTrackedQuickBuyTradeIds();
    const second = getTrackedQuickBuyTradeIds();

    expect(first).toEqual([]);
    expect(second).toBe(first);
  });

  it('returns a freshly allocated array once a trade is tracked', () => {
    const empty = getTrackedQuickBuyTradeIds();
    trackQuickBuyTrade('tx-1', buyTrade);

    const populated = getTrackedQuickBuyTradeIds();

    expect(populated).toEqual(['tx-1']);
    expect(populated).not.toBe(empty);
  });

  it('lists all tracked tx meta ids', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    trackQuickBuyTrade('tx-2', sellTrade);

    expect(getTrackedQuickBuyTradeIds().sort()).toEqual(['tx-1', 'tx-2']);
  });

  it('overwrites the info when the same id is tracked again', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    trackQuickBuyTrade('tx-1', sellTrade);

    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
    expect(getTrackedQuickBuyTrade('tx-1')).toEqual(sellTrade);
  });

  it('removes a tracked trade on untrack', () => {
    trackQuickBuyTrade('tx-1', buyTrade);

    untrackQuickBuyTrade('tx-1');

    expect(getTrackedQuickBuyTrade('tx-1')).toBeUndefined();
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('ignores untracking an unknown id', () => {
    trackQuickBuyTrade('tx-1', buyTrade);

    expect(() => untrackQuickBuyTrade('missing')).not.toThrow();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
  });

  describe('submission marker', () => {
    it('reflects in-flight submissions via the counter', () => {
      expect(hasPendingQuickBuySubmission()).toBe(false);

      beginQuickBuySubmission();
      expect(hasPendingQuickBuySubmission()).toBe(true);

      endQuickBuySubmission();
      expect(hasPendingQuickBuySubmission()).toBe(false);
    });

    it('stays active until all overlapping submissions end', () => {
      beginQuickBuySubmission();
      beginQuickBuySubmission();

      endQuickBuySubmission();
      expect(hasPendingQuickBuySubmission()).toBe(true);

      endQuickBuySubmission();
      expect(hasPendingQuickBuySubmission()).toBe(false);
    });

    it('never drops below zero on unbalanced ends', () => {
      endQuickBuySubmission();

      expect(hasPendingQuickBuySubmission()).toBe(false);

      beginQuickBuySubmission();
      expect(hasPendingQuickBuySubmission()).toBe(true);
    });
  });

  describe('isQuickBuyTransaction', () => {
    it('matches a transaction already tracked by id', () => {
      trackQuickBuyTrade('tx-1', buyTrade);

      expect(isQuickBuyTransaction(txMeta({ id: 'tx-1' }))).toBe(true);
    });

    it('matches an in-flight swap/bridge/batch transaction during submission', () => {
      beginQuickBuySubmission();

      expect(
        isQuickBuyTransaction(
          txMeta({ id: 'tx-9', type: TransactionType.batch }),
        ),
      ).toBe(true);
      expect(
        isQuickBuyTransaction(
          txMeta({ id: 'tx-9', type: TransactionType.swap }),
        ),
      ).toBe(true);
      expect(
        isQuickBuyTransaction(
          txMeta({ id: 'tx-9', type: TransactionType.bridge }),
        ),
      ).toBe(true);
    });

    it('matches a batch whose nested transaction is a swap during submission', () => {
      beginQuickBuySubmission();

      expect(
        isQuickBuyTransaction(
          txMeta({
            id: 'tx-9',
            type: TransactionType.batch,
            nestedTransactions: [{ type: TransactionType.swap }],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any),
        ),
      ).toBe(true);
    });

    it('does not match an unrelated in-flight transaction type', () => {
      beginQuickBuySubmission();

      expect(
        isQuickBuyTransaction(
          txMeta({ id: 'tx-9', type: TransactionType.simpleSend }),
        ),
      ).toBe(false);
    });

    it('does not match when there is no marker and no tracked id', () => {
      expect(
        isQuickBuyTransaction(
          txMeta({ id: 'tx-9', type: TransactionType.swap }),
        ),
      ).toBe(false);
    });

    it('still matches a trade after it has settled (covers the delayed re-check)', () => {
      trackQuickBuyTrade('tx-1', buyTrade);
      markQuickBuyTradeSettled('tx-1');

      expect(getTrackedQuickBuyTradeIds()).toEqual([]);
      expect(isQuickBuyTransaction(txMeta({ id: 'tx-1' }))).toBe(true);
    });

    it('stops matching a settled trade once it is explicitly untracked', () => {
      trackQuickBuyTrade('tx-1', buyTrade);
      markQuickBuyTradeSettled('tx-1');
      untrackQuickBuyTrade('tx-1');

      expect(isQuickBuyTransaction(txMeta({ id: 'tx-1' }))).toBe(false);
    });
  });

  describe('markQuickBuyTradeSettled', () => {
    it('removes the trade from the active registry so the terminal toast does not repeat', () => {
      trackQuickBuyTrade('tx-1', buyTrade);

      markQuickBuyTradeSettled('tx-1');

      expect(getTrackedQuickBuyTrade('tx-1')).toBeUndefined();
      expect(getTrackedQuickBuyTradeIds()).toEqual([]);
    });

    it('evicts the oldest settled id once the retention cap is exceeded', () => {
      for (let i = 0; i < 51; i += 1) {
        markQuickBuyTradeSettled(`tx-${i}`);
      }

      expect(isQuickBuyTransaction(txMeta({ id: 'tx-0' }))).toBe(false);
      expect(isQuickBuyTransaction(txMeta({ id: 'tx-1' }))).toBe(true);
      expect(isQuickBuyTransaction(txMeta({ id: 'tx-50' }))).toBe(true);
    });

    it('refreshes a re-settled id so it survives further eviction', () => {
      markQuickBuyTradeSettled('keep-me');
      for (let i = 0; i < 49; i += 1) {
        markQuickBuyTradeSettled(`tx-${i}`);
      }
      // Re-settle to move it to the newest position before overflowing.
      markQuickBuyTradeSettled('keep-me');
      markQuickBuyTradeSettled('overflow');

      expect(isQuickBuyTransaction(txMeta({ id: 'keep-me' }))).toBe(true);
    });
  });
});
