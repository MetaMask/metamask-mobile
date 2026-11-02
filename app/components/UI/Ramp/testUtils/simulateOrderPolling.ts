import AppConstants from '../../../../core/AppConstants';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders';
import processOrder from '../orderProcessor';
import type { ProcessorOptions } from '../index';

export const ORDER_POLL_INTERVAL_MS =
  AppConstants.FIAT_ORDERS.POLLING_FREQUENCY;
export const SECOND_MS = 1000;
export const DAY_MS = 24 * 60 * 60 * SECOND_MS;

/**
 * TRAM-3417: the stored-order fields the client fix adds (Tech Lead decisions,
 * Nov 1): `providerRemoved` marks an UNKNOWN + PROVIDER_REMOVED order as final,
 * `statusDescription` keeps the API's text, and `fetchErrorCount` counts
 * consecutive failed fetches (cleared on any reply; `errorCount` keeps today's
 * behaviour). `FiatOrder` on main has none of them, so this narrow extension
 * adds only those three fields.
 */
export type ProviderRemovedFiatOrder = FiatOrder & {
  providerRemoved?: boolean;
  statusDescription?: string;
  fetchErrorCount?: number;
};

/**
 * Runs one `processOrder` call (for example a forced refresh when the user
 * opens the order) with `Date.now` at `clockMs`, as the polling loop does.
 *
 * @param order - The stored order.
 * @param clockMs - The clock time for the call.
 * @param options - Processor options, such as `{ forced: true }`.
 * @returns The order `processOrder` returns.
 */
export async function processOrderAt(
  order: FiatOrder,
  clockMs: number,
  options?: ProcessorOptions,
): Promise<ProviderRemovedFiatOrder> {
  const dateNow = jest.spyOn(Date, 'now').mockImplementation(() => clockMs);
  try {
    return await processOrder(order, options);
  } finally {
    dateNow.mockRestore();
  }
}

export interface OrderPollingRun {
  /** The order as the last tick left it. */
  order: ProviderRemovedFiatOrder;
  /** Clock times (ms since the start) of the ticks that reached the network. */
  fetchedAtMs: number[];
  endedBecause: 'order_left_pending' | 'horizon' | 'fetch_limit';
}

/**
 * Replays the `FiatOrders` pending-order loop (`app/components/UI/Ramp/index.tsx`):
 * every `POLLING_FREQUENCY` ms, while the order is PENDING (`getPendingOrders`),
 * it runs the real `processOrder` and stores the result. The clock is driven
 * through `Date.now`, as the existing processor tests do; no timers are faked.
 *
 * @param order - The stored order to poll.
 * @param horizonMs - How long to simulate.
 * @param fetchCount - Returns how many fetches reached the network so far.
 * @param fetchLimit - Stops early once this many fetches happened, so a run
 * that never backs off ends quickly instead of making thousands of requests.
 * @returns The final order, the fetch times and why the run ended.
 */
export async function simulateOrderPolling(
  order: FiatOrder,
  horizonMs: number,
  fetchCount: () => number,
  fetchLimit = 50,
): Promise<OrderPollingRun> {
  const startMs = order.lastTimeFetched ?? 0;
  const fetchedAtMs: number[] = [];
  let current = order;
  let clockMs = startMs;
  const dateNow = jest.spyOn(Date, 'now').mockImplementation(() => clockMs);
  const end = (endedBecause: OrderPollingRun['endedBecause']) => ({
    order: current,
    fetchedAtMs,
    endedBecause,
  });

  try {
    for (
      let elapsed = 0;
      elapsed <= horizonMs;
      elapsed += ORDER_POLL_INTERVAL_MS
    ) {
      if (current.state !== FIAT_ORDER_STATES.PENDING)
        return end('order_left_pending');
      clockMs = startMs + elapsed;
      // Drop recorded Date.now calls so a long run does not hold millions.
      if (elapsed % (1000 * ORDER_POLL_INTERVAL_MS) === 0) dateNow.mockClear();
      const before = fetchCount();
      current = await processOrder(current);
      if (fetchCount() > before && fetchedAtMs.push(elapsed) >= fetchLimit) {
        return end('fetch_limit');
      }
    }
    return end('horizon');
  } finally {
    dateNow.mockRestore();
  }
}

/**
 * The fetch times the existing error backoff produces: after `n` consecutive
 * failures the next fetch waits `(POLLING_FREQUENCY / 1000) ^ (n + 1)` seconds,
 * rounded up to the next poll tick.
 *
 * @param failures - How many consecutive failures to schedule.
 * @param maxErrorCount - The cap on the error count, if any.
 * @returns Fetch times in ms since the first fetch.
 */
export function backoffScheduleMs(
  failures: number,
  maxErrorCount = Infinity,
): number[] {
  const base = ORDER_POLL_INTERVAL_MS / SECOND_MS;
  const times = [0];
  for (let errorCount = 1; times.length < failures; errorCount++) {
    const waitMs =
      Math.pow(base, Math.min(errorCount, maxErrorCount) + 1) * SECOND_MS;
    const previous = times[times.length - 1];
    times.push(
      Math.ceil((previous + waitMs) / ORDER_POLL_INTERVAL_MS) *
        ORDER_POLL_INTERVAL_MS,
    );
  }
  return times;
}
