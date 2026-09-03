import { AggregatedOrderBookConnection } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';

/**
 * Dedicated Hyperliquid WebSocket for the Pro order-book panel's server-
 * aggregated (`nSigFigs`) subscription.
 *
 * Kept separate from `PerpsController.subscribeToOrderBook` (shared socket) so
 * the raw full-precision book and the aggregated ladder for the same coin
 * cannot cross-contaminate — mirroring Extension's
 * `AggregatedOrderBookConnection` wiring in `metamask-controller`.
 *
 * Lazy singleton: created on first use and reused for the app lifetime. The
 * connection tears its socket down when the last subscriber unsubscribes.
 */
let aggregatedOrderBookConnection: AggregatedOrderBookConnection | null = null;

export function getAggregatedOrderBookConnection(): AggregatedOrderBookConnection {
  if (!aggregatedOrderBookConnection) {
    aggregatedOrderBookConnection = new AggregatedOrderBookConnection({
      isTestnet: () =>
        Boolean(Engine.context.PerpsController?.state?.isTestnet),
    });
  }
  return aggregatedOrderBookConnection;
}

/**
 * Test-only: drop the singleton so the next call builds a fresh connection.
 */
export function resetAggregatedOrderBookConnectionForTesting(): void {
  aggregatedOrderBookConnection?.close();
  aggregatedOrderBookConnection = null;
}
