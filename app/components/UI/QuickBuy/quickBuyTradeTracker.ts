import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { QuickBuyTradeMode } from './types';

export interface TrackedQuickBuyTrade {
  tradeMode: QuickBuyTradeMode;
  /** The token the user is trading (e.g. ETH) — the QuickBuy target. */
  tokenSymbol: string;
  /** Pay-with token for a buy, receive token for a sell (e.g. USDC). */
  counterTokenSymbol: string;
  /** Formatted fiat headline for the trade (e.g. "$50.00"). */
  fiatAmountLabel: string;
  /** Formatted exchange rate quote (e.g. "1 ETH = 4,381.22 USDC"). */
  rate?: string;
  /**
   * True only for same-chain non-EVM (Solana) swaps. `BridgeStatusController`
   * never marks these terminal (no polling, no `TransactionController`
   * confirmation), so their complete/failed toast must be resolved from
   * `MultichainTransactionsController` instead. EVM swaps and cross-chain
   * bridges (incl. Solana → EVM) leave this falsy and stay on the bridge path.
   */
  isNonEvmSwap?: boolean;
  /**
   * Solana transaction signature (`submitTx` result `hash`) used to find the
   * tx in `MultichainTransactionsController`. Only set for `isNonEvmSwap`
   * trades; lookups fall back to the tracker key when absent.
   */
  txSignature?: string;
}

/**
 * In-memory registry of QuickBuy-initiated trades, keyed by the source
 * transaction meta id returned from `BridgeStatusController.submitTx`.
 *
 * Scopes the global swap-status toast handler to trades the user started from
 * QuickBuy and carries the copy data (token pair, amount, rate) needed to build
 * the complete/failed toast long after the sheet has unmounted. It deliberately
 * lives outside React so it survives navigation. It is not persisted, so an app
 * restart drops tracking (the swap still appears in Activity).
 */
const trackedTrades = new Map<string, TrackedQuickBuyTrade>();

/** Shared empty result so the common "nothing tracked" path allocates nothing. */
const EMPTY_TRADE_IDS: string[] = [];

/**
 * Ids of QuickBuy trades that have reached a terminal state and been untracked.
 *
 * The terminal handler untracks a trade the instant the swap settles, but
 * `NotificationManager` re-checks the skip predicates ~2s *after*
 * `transactionConfirmed`/`transactionFailed` (a delayed `setTimeout`). For a
 * fast-settling QuickBuy the trade would already be gone from `trackedTrades`
 * by then, so the generic success/error toast would leak on top of QuickBuy's
 * own terminal toast. Remembering recently-settled ids keeps suppression alive
 * across that window.
 *
 * Bounded (insertion-ordered FIFO eviction) so it can never grow unbounded;
 * QuickBuy ids are globally-unique tx meta ids, so retaining a small recent
 * history is harmless.
 */
const settledTradeIds = new Set<string>();

/**
 * Upper bound on remembered settled ids. Comfortably larger than any realistic
 * number of QuickBuy trades settling within the ~2s notification re-check
 * window, while keeping memory trivially small.
 */
const SETTLED_TRADE_ID_LIMIT = 50;

export function trackQuickBuyTrade(
  txMetaId: string,
  info: TrackedQuickBuyTrade,
): void {
  trackedTrades.set(txMetaId, info);
}

export function getTrackedQuickBuyTrade(
  txMetaId: string,
): TrackedQuickBuyTrade | undefined {
  return trackedTrades.get(txMetaId);
}

export function getTrackedQuickBuyTradeIds(): string[] {
  // Hot path: both controller `stateChange` handlers call this on every
  // emission. Skip the array allocation entirely when nothing is tracked
  // (the common case — no QuickBuy swap in flight).
  if (trackedTrades.size === 0) {
    return EMPTY_TRADE_IDS;
  }
  return Array.from(trackedTrades.keys());
}

export function untrackQuickBuyTrade(txMetaId: string): void {
  trackedTrades.delete(txMetaId);
  settledTradeIds.delete(txMetaId);
}

/**
 * Marks a trade as terminally settled: removes it from the active registry (so
 * the terminal toast is not emitted twice) while remembering its id so the
 * delayed generic-notification re-check still suppresses the leftover
 * success/error toast.
 */
export function markQuickBuyTradeSettled(txMetaId: string): void {
  trackedTrades.delete(txMetaId);

  // Re-insert to refresh FIFO position, then evict the oldest if over the cap.
  settledTradeIds.delete(txMetaId);
  settledTradeIds.add(txMetaId);
  if (settledTradeIds.size > SETTLED_TRADE_ID_LIMIT) {
    const oldest = settledTradeIds.values().next().value;
    if (oldest !== undefined) {
      settledTradeIds.delete(oldest);
    }
  }
}

/** Clears all remembered settled ids. Intended for test isolation. */
export function clearSettledQuickBuyTrades(): void {
  settledTradeIds.clear();
}

/**
 * Count of QuickBuy submissions currently in flight.
 *
 * The source transaction meta id is only known once `submitTx` resolves, but
 * the generic transaction notification fires earlier (on `transactionApproved`,
 * mid-submit). This marker lets us suppress that early notification before the
 * id is registered. A counter (rather than a boolean) tolerates overlapping
 * submissions without prematurely clearing the marker.
 */
let pendingSubmissions = 0;

export function beginQuickBuySubmission(): void {
  pendingSubmissions += 1;
}

export function endQuickBuySubmission(): void {
  pendingSubmissions = Math.max(0, pendingSubmissions - 1);
}

export function hasPendingQuickBuySubmission(): boolean {
  return pendingSubmissions > 0;
}

// Transaction types a QuickBuy submission can produce. Used to narrow the
// marker window so an unrelated transaction approving mid-submit is not
// suppressed. `batch` is the 7702 wrapper that triggers the duplicate
// notification; swap/bridge cover the non-batched paths.
const QUICK_BUY_SUPPRESSED_TYPES: TransactionType[] = [
  TransactionType.batch,
  TransactionType.swap,
  TransactionType.bridge,
];

/**
 * Predicate consumed by `NotificationManager` to skip the generic transaction
 * notification for QuickBuy-initiated trades. Matches a transaction that is
 * either currently tracked by id, recently settled by id (covers the delayed
 * generic-toast re-check that fires after the trade is untracked), or — while a
 * submission is in flight — a swap/bridge/batch transaction (covers the pending
 * notification that fires before the id is known).
 */
export function isQuickBuyTransaction(
  transactionMeta: TransactionMeta | undefined,
): boolean {
  if (transactionMeta?.id) {
    if (getTrackedQuickBuyTrade(transactionMeta.id)) {
      return true;
    }
    if (settledTradeIds.has(transactionMeta.id)) {
      return true;
    }
  }

  if (!hasPendingQuickBuySubmission()) {
    return false;
  }

  const { type, nestedTransactions } = transactionMeta ?? {};

  if (type && QUICK_BUY_SUPPRESSED_TYPES.includes(type)) {
    return true;
  }

  return Boolean(
    nestedTransactions?.some(
      (tx) => tx.type && QUICK_BUY_SUPPRESSED_TYPES.includes(tx.type),
    ),
  );
}
