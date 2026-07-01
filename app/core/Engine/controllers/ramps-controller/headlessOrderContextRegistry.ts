import type { RampSurface } from '../../../../components/UI/Ramp/types/depositAnalytics';
import { extractOrderCode } from '../../../../components/UI/Ramp/utils/extractOrderCode';

/**
 * Headless order-context registry (TRAM-3623 AC5).
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
 * THIS IS OPTION B (in-memory, same-session only). The map is module state, so
 * it is EMPTY after an app relaunch. Consequence: a headless order that fails
 * AFTER the app has been closed and reopened is NOT tagged - the handler
 * finds no entry and no-ops (rather than emitting an untagged/mis-tagged
 * event). Same-session terminal failures are fully covered.
 *
 * TODO(Plan A): to also cover the app-closed / late-failure case, replace this
 * module Map with a persisted redux slice. A new top-level reducer key
 * auto-persists via the root blacklist in `app/store/persistConfig` (no
 * allowlist add, no migration). Because it would persist by default and is only
 * cleaned on a terminal status that may never arrive (stuck-Pending,
 * `removeOrder` without a terminal event), Plan A MUST add an eviction policy:
 * a per-entry `createdAt` + GC-on-write evicting entries older than N days
 * (mirror `sessionRegistry`'s `STALE_SESSION_TTL_MS`) plus a size cap. See the
 * plan doc (`tram-3623-wire-transaction-failed.md`).
 */
export interface HeadlessOrderContext {
  rampSurface?: RampSurface;
  region: string;
}

/**
 * Keyed by `extractOrderCode(providerOrderId)`. The key is normalized via
 * `extractOrderCode` on BOTH set and get so a write of a full path (e.g.
 * `/providers/transak/orders/abc-123`) and a later read of the bare code
 * (`abc-123`, the form the RampsController stores and the handler receives)
 * resolve to the same entry.
 */
const headlessOrderContexts = new Map<string, HeadlessOrderContext>();

/**
 * Stores the headless context for an order. Called from the headless-gated
 * CONFIRMED branches in `useTransakRouting`.
 *
 * @param providerOrderId - The order id (full path or bare code); normalized.
 * @param context - The headless context to carry to the terminal event.
 */
export function setHeadlessOrderContext(
  providerOrderId: string,
  context: HeadlessOrderContext,
): void {
  headlessOrderContexts.set(extractOrderCode(providerOrderId), context);
}

/**
 * Looks up the headless context for an order. Returns `undefined` when the
 * order was not headless (or after an app relaunch under Option B).
 *
 * @param providerOrderId - The order id (full path or bare code); normalized.
 * @returns The stored context, or `undefined` when absent.
 */
export function getHeadlessOrderContext(
  providerOrderId: string,
): HeadlessOrderContext | undefined {
  return headlessOrderContexts.get(extractOrderCode(providerOrderId));
}

/**
 * Removes the headless context for an order. Called by
 * `handleOrderStatusChangedForMetrics` on every terminal status of a headless
 * order (after emitting on failure, and on Completed/Cancelled) so the map does
 * not grow within a session.
 *
 * @param providerOrderId - The order id (full path or bare code); normalized.
 */
export function deleteHeadlessOrderContext(providerOrderId: string): void {
  headlessOrderContexts.delete(extractOrderCode(providerOrderId));
}

/**
 * Test-only helper. Clears the registry between tests so entries do not leak
 * from one test into another.
 */
export function __resetHeadlessOrderContextRegistryForTests(): void {
  headlessOrderContexts.clear();
}
