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
 * notification for QuickBuy-initiated trades. Matches either a transaction
 * already tracked by id (covers the later complete/confirmed notification) or,
 * while a submission is in flight, a swap/bridge/batch transaction (covers the
 * pending notification that fires before the id is known).
 */
export function isQuickBuyTransaction(
  transactionMeta: TransactionMeta | undefined,
): boolean {
  if (transactionMeta?.id && getTrackedQuickBuyTrade(transactionMeta.id)) {
    return true;
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
