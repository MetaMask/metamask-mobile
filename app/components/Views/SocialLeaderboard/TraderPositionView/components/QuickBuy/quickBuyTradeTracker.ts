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
  return Array.from(trackedTrades.keys());
}

export function untrackQuickBuyTrade(txMetaId: string): void {
  trackedTrades.delete(txMetaId);
}
