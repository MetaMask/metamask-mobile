import type { RampSurface } from '../../../../components/UI/Ramp/types/depositAnalytics';
import { extractOrderCode } from '../../../../components/UI/Ramp/utils/extractOrderCode';
import ReduxService from '../../../redux';
import {
  setHeadlessOrderContextEntry,
  removeHeadlessOrderContextEntry,
  clearHeadlessOrderContexts,
} from '../../../redux/slices/headlessOrderContexts';

/**
 * Headless order-context registry (TRAM-3623 AC5 / TRAM-3691 Part B).
 *
 * Late/terminal headless failures are observable only via
 * `RampsController:orderStatusChanged` (Engine-level polling), and the
 * `RampsOrder` delivered there carries no `ramp_surface` and no headless
 * marker. The headless session is already torn down by terminal time, so the
 * context needed to tag `RAMPS_TRANSACTION_FAILED` (which `ramp_surface`, which
 * `region`) must be carried from order-creation to the terminal event. This
 * module is that carrier: `useTransakRouting` writes the context when a
 * headless order is confirmed, and `handleOrderStatusChangedForMetrics` reads it
 * when the order later fails.
 *
 * The context is persisted in the `headlessOrderContexts` redux slice (Plan A),
 * so it survives an app relaunch — a headless order that fails AFTER the app is
 * closed and reopened (e.g. a multi-day manual bank transfer) is still tagged
 * `HEADLESS`. The slice auto-persists (root blacklist in `app/store/persistConfig`,
 * no migration) and self-evicts stale entries on write via
 * `HEADLESS_ORDER_CONTEXT_TTL_MS`.
 *
 * Reads/writes go through `ReduxService.store` synchronously, mirroring how the
 * rest of core (EngineService, OAuthService) touches redux outside React.
 */
export interface HeadlessOrderContext {
  rampSurface?: RampSurface;
  region: string;
}

/**
 * Stores the headless context for an order. Called from the headless-gated
 * CONFIRMED branches in `useTransakRouting`.
 *
 * The key is normalized via `extractOrderCode` on BOTH set and get so a write
 * of a full path (e.g. `/providers/transak/orders/abc-123`) and a later read of
 * the bare code (`abc-123`, the form the RampsController stores and the handler
 * receives) resolve to the same entry. (The F1 key-divergence finding was in the
 * Part A core dedup registry, not here — set/get already align.)
 *
 * @param providerOrderId - The order id (full path or bare code); normalized.
 * @param context - The headless context to carry to the terminal event.
 */
export function setHeadlessOrderContext(
  providerOrderId: string,
  context: HeadlessOrderContext,
): void {
  ReduxService.store.dispatch(
    setHeadlessOrderContextEntry({
      key: extractOrderCode(providerOrderId),
      context,
    }),
  );
}

/**
 * Looks up the headless context for an order. Returns `undefined` when the
 * order was not headless (or its context has expired).
 *
 * @param providerOrderId - The order id (full path or bare code); normalized.
 * @returns The stored context, or `undefined` when absent.
 */
export function getHeadlessOrderContext(
  providerOrderId: string,
): HeadlessOrderContext | undefined {
  const entry =
    ReduxService.store.getState().headlessOrderContexts[
      extractOrderCode(providerOrderId)
    ];
  return entry
    ? { rampSurface: entry.rampSurface, region: entry.region }
    : undefined;
}

/**
 * Removes the headless context for an order. Called by
 * `handleOrderStatusChangedForMetrics` on every terminal status of a headless
 * order (after emitting on failure, and on Completed/Cancelled) so the slice
 * does not grow.
 *
 * @param providerOrderId - The order id (full path or bare code); normalized.
 */
export function deleteHeadlessOrderContext(providerOrderId: string): void {
  ReduxService.store.dispatch(
    removeHeadlessOrderContextEntry(extractOrderCode(providerOrderId)),
  );
}

/**
 * Test-only helper. Clears the registry between tests so entries do not leak
 * from one test into another.
 */
export function __resetHeadlessOrderContextRegistryForTests(): void {
  ReduxService.store.dispatch(clearHeadlessOrderContexts());
}
