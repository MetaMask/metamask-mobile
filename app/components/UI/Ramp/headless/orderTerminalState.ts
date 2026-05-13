import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';

import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux';
import { selectRampsOrders } from '../../../../selectors/rampsController';
import { extractOrderCode } from '../utils/extractOrderCode';

/**
 * Default cadence at which {@link awaitOrderTerminalState} polls
 * `RampsController.getOrder` directly. Chosen so the helper is responsive
 * enough for typical TPC settlement waits (seconds-to-minutes) without
 * hammering the provider API. Consumers can override via `pollIntervalMs`.
 */
const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * Statuses that mean the order won't change again — `awaitOrderTerminalState`
 * resolves as soon as the order's `status` lands here. `IdExpired` is treated
 * as terminal because the existing display layer already maps it to FAILED
 * (see `app/components/UI/Ramp/utils/displayOrder.ts`).
 *
 * `Unknown` is intentionally NOT terminal: the unified order processor treats
 * it as transient and increments an error counter, and we want
 * `awaitOrderTerminalState` to wait through that retry window rather than
 * resolve a half-fetched record.
 */
const TERMINAL_ORDER_STATUSES: ReadonlySet<RampsOrderStatus> = new Set([
  RampsOrderStatus.Completed,
  RampsOrderStatus.Failed,
  RampsOrderStatus.Cancelled,
  RampsOrderStatus.IdExpired,
]);

export function isTerminalOrderStatus(status: RampsOrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.has(status);
}

/**
 * Thrown by {@link awaitOrderTerminalState} when `timeoutMs` elapses before
 * the order reaches a terminal state.
 *
 * `Object.setPrototypeOf` keeps `instanceof` working through Hermes/Metro
 * target lowering — without it, `error instanceof OrderTerminalStateTimeoutError`
 * is unreliable on RN.
 */
export class OrderTerminalStateTimeoutError extends Error {
  constructor(message?: string) {
    super(message ?? 'awaitOrderTerminalState: timed out');
    this.name = 'OrderTerminalStateTimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown by {@link refreshOrder} when the order can't be resolved enough to
 * issue the controller call (missing `provider.id` or `walletAddress`).
 */
export class RefreshOrderUnresolvableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefreshOrderUnresolvableError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown by {@link awaitOrderTerminalState} when called with an `orderId`
 * that isn't in redux AND no `options.walletAddress` to back the slow-path
 * poll. Signals consumer misuse (vs {@link OrderTerminalStateTimeoutError}
 * which signals a genuinely slow provider).
 *
 * `Object.setPrototypeOf` keeps `instanceof` working through Hermes/Metro
 * target lowering — without it, the `instanceof` check is unreliable on RN.
 */
export class AwaitOrderTerminalStatePrerequisitesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AwaitOrderTerminalStatePrerequisitesError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Synchronous read of an order from RampsController state. Imperative
 * counterpart to the `getOrder` method on `useHeadlessBuy()` — usable from
 * non-React consumers (e.g. MetaMask Pay's `TransactionPayController`).
 *
 * Reads via the **unscoped** `selectRampsOrders` selector — returns any
 * matching order regardless of which account group owns it. This is
 * deliberate: controller-side consumers don't necessarily have a "selected
 * account group" in redux, and would lose access to their own tracked
 * orders if this scoped to one. The React-only `useHeadlessBuy().getOrderById`
 * is the account-group-scoped twin for in-app UI consumers — see its
 * JSDoc in `types.ts` for the behaviour difference.
 *
 * Accepts either a bare `providerOrderId` or a full `/providers/.../orders/<id>`
 * path; both shapes are normalised through `extractOrderCode`.
 */
export function getOrder(providerOrderId: string): RampsOrder | undefined {
  const orderCode = extractOrderCode(providerOrderId);
  const orders = selectRampsOrders(ReduxService.store.getState());
  return orders.find((o) => o.providerOrderId === orderCode);
}

export interface RefreshOrderOptions {
  /**
   * Wallet address to scope the controller call. Defaults to the order's
   * own `walletAddress`. Only required when the caller passes a string
   * `providerOrderId` and the order isn't yet in state.
   */
  walletAddress?: string;
}

/**
 * Imperative network refresh — calls `RampsController.getOrder` and returns
 * the fresh `RampsOrder` shape. Does **not** write the result back to redux;
 * state is updated by the unified order processor when it polls.
 *
 * Accepts either an order id (string) or a full `RampsOrder`. Resolving
 * `providerCode` and `walletAddress` from the order itself avoids forcing
 * non-React consumers to keep a parallel index of those fields.
 */
export async function refreshOrder(
  orderIdOrOrder: string | RampsOrder,
  options?: RefreshOrderOptions,
): Promise<RampsOrder> {
  const order =
    typeof orderIdOrOrder === 'string'
      ? getOrder(orderIdOrOrder)
      : orderIdOrOrder;
  const providerOrderId =
    typeof orderIdOrOrder === 'string'
      ? orderIdOrOrder
      : orderIdOrOrder.providerOrderId;
  const orderCode = extractOrderCode(providerOrderId);

  const providerCode = order?.provider?.id;
  if (!providerCode) {
    throw new RefreshOrderUnresolvableError(
      `refreshOrder: order "${providerOrderId}" has no provider.id; cannot resolve providerCode. ` +
        'Pass the full RampsOrder argument or wait for the order to materialise in state ' +
        '(also: provide options.walletAddress if state is not yet hydrated).',
    );
  }

  const walletAddress = options?.walletAddress ?? order?.walletAddress;
  if (!walletAddress) {
    throw new RefreshOrderUnresolvableError(
      `refreshOrder: order "${providerOrderId}" has no walletAddress. ` +
        'Pass options.walletAddress explicitly, or wait for the order to materialise in state.',
    );
  }

  return Engine.context.RampsController.getOrder(
    providerCode,
    orderCode,
    walletAddress,
  );
}

export interface AwaitOrderTerminalStateOptions {
  /**
   * Reject the returned promise with an {@link OrderTerminalStateTimeoutError}
   * after this many milliseconds.
   *
   * **Defaults to `undefined` → unbounded wait.** This is load-bearing, not
   * optional, for consumers who need to gate a downstream action on the
   * result: an order stuck in `Pending` would otherwise hang the consumer's
   * promise indefinitely (and combined with an invisible host, hang their
   * UI). The TPC example below uses `5 * 60 * 1000` — that's the
   * recommended default for any consumer gating downstream behavior on
   * settlement.
   */
  timeoutMs?: number;
  /**
   * How often the helper falls back to a direct controller poll when the
   * redux subscription hasn't surfaced an update yet. Defaults to 5000ms.
   * Lower values are friendlier to interactive consumers but heavier on the
   * provider API.
   */
  pollIntervalMs?: number;
  /**
   * Wallet address used by the slow-path poll. Defaults to the in-state
   * order's `walletAddress`. **Recommended**: always pass
   * `order.walletAddress` from your `onOrderCreated` handler — it makes
   * the slow-path resilient if the in-state order is cleared between the
   * fire and the await, and it's the contract enforced by the pre-flight
   * check (see {@link AwaitOrderTerminalStatePrerequisitesError}).
   */
  walletAddress?: string;
}

/**
 * Resolves with the order once its `status` reaches a terminal state
 * (`Completed | Failed | Cancelled | IdExpired`).
 *
 * **Recommended invocation** (after Phase 9 / Fix #3.1 widened
 * `onOrderCreated` to hand you the full `RampsOrder`):
 *
 * ```ts
 * const final = await awaitOrderTerminalState(orderId, {
 *   walletAddress: order.walletAddress,   // load-bearing in controller contexts
 *   timeoutMs: 5 * 60 * 1000,              // bounds slow providers
 * });
 * ```
 *
 * The helper is **self-sufficient** — it does not assume the unified order
 * processor (`<FiatOrders />` in `app/components/UI/Ramp/index.tsx`, mounted
 * as `<RampOrders />` at `Nav/Main/index.js:426`) is running in sync with
 * the caller. `<FiatOrders />` IS always mounted while the app is
 * foregrounded, but MetaMask Pay's `TransactionPayController` runs in an
 * Engine controller context where the React tree's polling timing isn't
 * necessarily aligned. Passing `walletAddress` keeps the slow-path
 * resilient if the in-state order is cleared between fire and await.
 *
 * It runs three layers in parallel, any of which can resolve the promise.
 * Fast path 0 is a synchronous read on entry; if the order is already
 * terminal, resolve immediately. Fast path 1 subscribes to redux: any
 * state writeback (from the unified processor or anything else) re-checks
 * the order and resolves if terminal — this is an optimisation, never
 * load-bearing. The slow path polls `RampsController.getOrder(...)` every
 * `pollIntervalMs` and resolves off the fresh response when its status is
 * terminal; the fresh order is not written back to state, so we resolve
 * from the controller call itself.
 *
 * **Pre-flight contract** (Fix #3.3): if the order is not in redux AND
 * `options.walletAddress` is not provided, the slow-path can never run
 * (`provider.id` is only readable from the in-state order). The helper
 * rejects synchronously with
 * {@link AwaitOrderTerminalStatePrerequisitesError} so consumer misuse
 * fails immediately instead of hanging the unbounded `timeoutMs`. This
 * is what makes the "always pass `walletAddress`" recommendation a
 * contract, not a suggestion.
 *
 * Cleanup: every termination path (resolve, reject, timeout) clears the
 * interval, unsubscribes from the store, and clears the timeout. There is
 * no shared subscription across calls — each call owns its own resources.
 *
 * Imperative counterpart to the method exposed on `useHeadlessBuy()`.
 */
export function awaitOrderTerminalState(
  providerOrderId: string,
  options?: AwaitOrderTerminalStateOptions,
): Promise<RampsOrder> {
  // Pre-flight (Fix #3.3): if the order isn't in redux AND no
  // `options.walletAddress` was passed, the slow-path can never run
  // (`provider.id` is only readable from the in-state order). With
  // `timeoutMs: undefined` (the default), this would otherwise hang the
  // promise forever. Reject loudly with a typed error so consumer misuse
  // — a stale `orderId`, a call before `addOrder` flushed, a cross-session
  // id from an external source — fails immediately instead of stalling.
  const inStateOrderAtStart = getOrder(providerOrderId);
  if (!inStateOrderAtStart && !options?.walletAddress) {
    return Promise.reject(
      new AwaitOrderTerminalStatePrerequisitesError(
        `awaitOrderTerminalState: order "${providerOrderId}" is not yet in redux and no options.walletAddress was provided. Either pass options.walletAddress (recommended: order.walletAddress from your onOrderCreated handler), or call this from a context where the order has already been dispatched.`,
      ),
    );
  }

  const orderCode = extractOrderCode(providerOrderId);
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  return new Promise<RampsOrder>((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let pollHandle: ReturnType<typeof setInterval> | undefined;

    const cleanup = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
      if (pollHandle !== undefined) {
        clearInterval(pollHandle);
        pollHandle = undefined;
      }
    };

    const settle = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      action();
    };

    const tryResolveFromOrder = (
      candidate: RampsOrder | undefined,
    ): boolean => {
      if (!candidate) {
        return false;
      }
      if (!isTerminalOrderStatus(candidate.status)) {
        return false;
      }
      settle(() => resolve(candidate));
      return true;
    };

    // Fast path 0: synchronous read.
    if (tryResolveFromOrder(getOrder(providerOrderId))) {
      return;
    }

    // Fast path 1: redux subscription.
    unsubscribe = ReduxService.store.subscribe(() => {
      tryResolveFromOrder(getOrder(providerOrderId));
    });

    // Slow path: self-poll via the controller. Driven on a fixed cadence
    // rather than a recursive setTimeout so cleanup is one clearInterval.
    const tick = async () => {
      if (settled) {
        return;
      }
      // Resolve the wallet on every tick — the in-state order may appear
      // mid-flight (e.g. addOrder flushes after we started polling).
      const inStateOrder = getOrder(providerOrderId);
      const providerCode = inStateOrder?.provider?.id;
      const walletAddress =
        options?.walletAddress ?? inStateOrder?.walletAddress;
      if (!providerCode || !walletAddress) {
        return;
      }
      try {
        const fresh = await Engine.context.RampsController.getOrder(
          providerCode,
          orderCode,
          walletAddress,
        );
        // Re-check the settled flag — a parallel resolution path
        // (subscription, timeout) may have closed out while we awaited.
        // Without this guard a future refactor that adds side effects in
        // tryResolveFromOrder would silently fire post-cleanup.
        if (settled) {
          return;
        }
        tryResolveFromOrder(fresh);
      } catch {
        // Swallow per-tick errors: a transient provider blip should not
        // settle the promise. The timeout (if set) is the bound on overall
        // wait time.
      }
    };
    pollHandle = setInterval(tick, pollIntervalMs);
    // Fire one tick immediately so callers don't wait `pollIntervalMs` for
    // the first slow-path call when redux is silent (e.g. unified order
    // processor not mounted in MMPay's controller context). The tick
    // returns a promise we deliberately ignore — settled-flag gating
    // handles late resolutions.
    tick().catch(() => undefined);

    if (options?.timeoutMs !== undefined) {
      timeoutHandle = setTimeout(() => {
        settle(() =>
          reject(
            new OrderTerminalStateTimeoutError(
              `awaitOrderTerminalState: timed out after ${options.timeoutMs}ms waiting for order "${providerOrderId}"`,
            ),
          ),
        );
      }, options.timeoutMs);
    }
  });
}
