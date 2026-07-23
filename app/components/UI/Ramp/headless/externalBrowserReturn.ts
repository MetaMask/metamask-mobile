import type { RampsOrder } from '@metamask/ramps-controller';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import { emitTerminalOrderAnalyticsFromCallback } from '../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics';
import { setHeadlessOrderContext } from '../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry';
import ReduxService from '../../../../core/redux';
import { protectWalletModalVisible } from '../../../../actions/user';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';

import type { RampSurface } from '../types/depositAnalytics';
import { extractOrderCode } from '../utils/extractOrderCode';
import { buildBaseProps } from '../utils/webviewFunnelAnalytics';
import { closeSession, getSession } from './sessionRegistry';
import type { HeadlessBuyCallbacks } from './types';

/**
 * Analytics context snapshotted at external-browser launch so the terminal
 * RAMPS_CHECKOUT_CLOSED / RAMPS_ORDER_FAILED events can carry the same
 * property shape the in-app Checkout WebView emits (TRAM-3623 parity),
 * even after the session itself is gone.
 */
export interface ExternalReturnAnalyticsContext {
  checkoutSessionId: string;
  providerName?: string;
  amountSource?: number;
  amountDestination?: number;
  paymentMethodId?: string;
  currencySource?: string;
  currencyDestination?: string;
  chainId?: string;
}

/**
 * Pending external-browser return correlation (P2.M2).
 *
 * Recorded at external-browser launch, keyed by session id, and matched back
 * to incoming deeplinks primarily by ORDER ID — the same name-on-the-ticket
 * scheme the non-headless flow already uses: the on-ramp backend mints a GUID
 * order code at widget creation (`customId: guid` for Coinbase/PayPal), the
 * widget response carries it as `buyWidget.orderId`, `addPrecreatedOrder`
 * persists a stub under it, and the provider's return deeplink carries it as
 * `?orderId=`. This record adds the one thing the stub cannot hold: which
 * headless session (and consumer callback) the return belongs to.
 *
 * E2 (success-deeplink-wins): `onOrderCreated` is retained on the record so a
 * success deeplink can complete the order even after the session was
 * dismissed (focus-dismissal, `beforeRemove`) or GC'd. MM Pay's two-step
 * intent transaction is gated on `onOrderCreated`; dropping a late success
 * would lose the paid order's second leg. Retention past dismissal is only
 * honored for records that carry an `orderId` (a named ticket): an orderless
 * record is only matchable while its session is still live, so it can never
 * hijack an unrelated return.
 */
export interface ExternalReturnCorrelation {
  sessionId: string;
  providerCode: string;
  /**
   * FALLBACK only, for orderless launches (no precreated stub exists). When
   * the record carries an `orderId`, the persisted Precreated stub is the
   * source of truth for the wallet on return — do not read this first.
   */
  walletAddress?: string;
  /** Pre-created order id from the widget response, when the provider returns one. */
  orderId?: string;
  rampSurface?: RampSurface;
  region?: string;
  analytics: ExternalReturnAnalyticsContext;
  onOrderCreated: HeadlessBuyCallbacks['onOrderCreated'];
  launchedAt: number;
}

/**
 * Correlations older than this are considered abandoned and are dropped on
 * read. Matches the session registry's stale-session TTL so a correlation
 * never outlives the window in which its session could have been revived.
 */
export const EXTERNAL_RETURN_TTL_MS = 60 * 60 * 1000;

const pendingCorrelations = new Map<string, ExternalReturnCorrelation>();

/**
 * Sessions currently running `completeHeadlessExternalReturn`. Guards the
 * race where the iOS `openAuth` resolution and a deeplink return (or two
 * deeplinks) try to complete the same session concurrently — a double
 * `onOrderCreated` would double-fire MM Pay's intent leg.
 */
const inFlightCompletions = new Set<string>();

function gcExpiredCorrelations(now: number): void {
  for (const [sessionId, record] of pendingCorrelations) {
    if (now - record.launchedAt > EXTERNAL_RETURN_TTL_MS) {
      pendingCorrelations.delete(sessionId);
    }
  }
}

export function recordExternalReturnCorrelation(
  correlation: ExternalReturnCorrelation,
): void {
  gcExpiredCorrelations(Date.now());
  pendingCorrelations.set(correlation.sessionId, correlation);
}

/**
 * Returns the pending correlation for a session, dropping it when
 * TTL-expired. Does NOT consume it — completion consumes via
 * `completeHeadlessExternalReturn`.
 */
export function getExternalReturnCorrelation(
  sessionId: string | undefined,
): ExternalReturnCorrelation | null {
  if (!sessionId) {
    return null;
  }
  const record = pendingCorrelations.get(sessionId);
  if (!record) {
    return null;
  }
  if (Date.now() - record.launchedAt > EXTERNAL_RETURN_TTL_MS) {
    pendingCorrelations.delete(sessionId);
    return null;
  }
  return record;
}

/**
 * Finds the correlation an incoming `metamask://on-ramp` return deeplink
 * belongs to, or `null` when the deeplink is not ours (e.g. a non-headless
 * UB1/UB2 external return) so the caller falls back to legacy routing.
 *
 * Matching mirrors the non-headless convention (the deeplink's `orderId` IS
 * the correlation key). A deeplink carrying an `orderId` matches the record
 * whose recorded order id equals it (normalized via `extractOrderCode`);
 * named matches are honored even after the session was dismissed or GC'd
 * (E2), and a named deeplink that matches no record is NOT ours — never fall
 * back to fuzzy matching. A deeplink without an `orderId` (provider stripped
 * the query) matches by provider code, but only among records whose session
 * is STILL LIVE and only when exactly one candidate matches: without a name
 * on the ticket, a live session is the only safe claim to the return.
 */
export function findExternalReturnCorrelationForDeeplink({
  orderId,
  providerCode,
}: {
  orderId?: string;
  providerCode?: string;
}): ExternalReturnCorrelation | null {
  gcExpiredCorrelations(Date.now());

  if (orderId) {
    const normalized = extractOrderCode(orderId);
    for (const record of pendingCorrelations.values()) {
      if (record.orderId && extractOrderCode(record.orderId) === normalized) {
        return record;
      }
    }
    return null;
  }

  const liveMatches: ExternalReturnCorrelation[] = [];
  for (const record of pendingCorrelations.values()) {
    if (providerCode && record.providerCode !== providerCode) {
      continue;
    }
    if (getSession(record.sessionId)) {
      liveMatches.push(record);
    }
  }
  return liveMatches.length === 1 ? liveMatches[0] : null;
}

/**
 * Clears a session's pending correlation. A call with `undefined` is a
 * no-op — there is no legitimate "clear whatever is pending" caller, and
 * non-headless code paths share call sites with headless ones.
 *
 * Intentionally NOT called on `user_dismissed` teardown: E2 requires a NAMED
 * (orderId-carrying) correlation to survive dismissal so a slow-but-successful
 * deeplink can still complete the order. Call sites are: successful
 * completion, any teardown that reported `onError` to the consumer (a later
 * `onOrderCreated` would violate the single-terminal-callback contract —
 * covers browser-open failures and order-resolution failures), and the iOS
 * `openAuth` cancel (once the auth session closes, no deeplink can follow).
 */
export function clearExternalReturnCorrelation(sessionId?: string): void {
  if (sessionId === undefined) {
    return;
  }
  pendingCorrelations.delete(sessionId);
}

export interface CompleteExternalReturnArgs {
  sessionId: string;
  providerCode: string;
  /**
   * Wallet the order belongs to. Optional: when omitted (the deeplink path),
   * it is resolved from the persisted Precreated stub the launch registered
   * (`addPrecreatedOrder`), falling back to the correlation record for
   * orderless launches.
   */
  walletAddress?: string;
  /** The full return URL (iOS `openAuth` result URL or the deeplink). */
  returnUrl: string;
  /** Order id fallback when the return URL cannot be resolved server-side. */
  orderIdFallback?: string;
  rampSurface?: RampSurface;
  region?: string;
}

/**
 * Shared callback resolver + session completion for external-browser returns
 * (P2.M1 iOS `openAuth` success, P2.M2 deeplink return).
 *
 * Resolves the order via `RampsController.getOrderFromCallback` (falling back
 * to `getOrder` with any known order id), registers it, carries the headless
 * analytics context to the terminal event, fires `onOrderCreated` exactly
 * once, and ends the session. Mirrors the in-app Checkout WebView's headless
 * success path so both checkout classes complete identically.
 *
 * E2: when the session is already gone (dismissed / GC'd), the retained
 * `onOrderCreated` from the correlation record is used, so a paid order's
 * consumer callback still fires.
 *
 * @returns The resolved order, or `null` when another completion for the same
 * session already ran (or is running) — callers treat `null` as "handled
 * elsewhere" and must not fall back to error paths.
 * @throws When the order cannot be resolved; callers own failure routing
 * (`failSession` + analytics vs. order-details fallback).
 */
export async function completeHeadlessExternalReturn(
  args: CompleteExternalReturnArgs,
): Promise<RampsOrder | null> {
  const { sessionId, providerCode, returnUrl } = args;

  if (inFlightCompletions.has(sessionId)) {
    return null;
  }

  const correlation = getExternalReturnCorrelation(sessionId);
  const session = getSession(sessionId);
  if (!correlation && !session) {
    // Nothing to complete: either a duplicate return after a completion
    // already consumed the correlation, or a stale deeplink for a session
    // that failed terminally.
    return null;
  }

  inFlightCompletions.add(sessionId);
  try {
    const { RampsController } = Engine.context;

    // Wallet resolution order: explicit caller value (iOS openAuth has it
    // in-hand), then the persisted Precreated stub keyed by the order code
    // (the index card the launch already filed), then the correlation's
    // orderless fallback.
    const knownOrderId =
      args.orderIdFallback ??
      extractOrderIdFromReturnUrl(returnUrl) ??
      correlation?.orderId;
    const stubOrder = knownOrderId
      ? findOrderInControllerState(knownOrderId)
      : undefined;
    const walletAddress =
      args.walletAddress ??
      stubOrder?.walletAddress ??
      correlation?.walletAddress;
    if (!walletAddress) {
      throw new Error(
        'No wallet address available to resolve external browser return',
      );
    }

    let order: RampsOrder | null = null;
    let lookupError: unknown;
    try {
      order = await RampsController.getOrderFromCallback(
        providerCode,
        returnUrl,
        walletAddress,
      );
    } catch (error) {
      lookupError = error;
    }

    if (!order && knownOrderId) {
      try {
        // Normalize to the bare order code: `buyWidget.orderId` can be a full
        // `/providers/.../orders/...` path, and `getOrder` splices the value
        // into a URL segment (same normalization OrderDetails applies).
        order = await RampsController.getOrder(
          providerCode,
          extractOrderCode(knownOrderId),
          walletAddress,
        );
      } catch (error) {
        lookupError = lookupError ?? error;
      }
    }

    if (!order) {
      throw lookupError instanceof Error
        ? lookupError
        : new Error('Order could not be resolved from external browser return');
    }

    RampsController.addOrder(order);
    // The external return skips OrderDetails, so an already-terminal order
    // would never be polled and its terminal metrics event would be lost.
    // Emit directly — no-ops for non-terminal orders and dedups against the
    // polling path (TRAM-3691), same as the in-app Checkout headless path.
    emitTerminalOrderAnalyticsFromCallback(order);

    const rampSurface = args.rampSurface ?? correlation?.rampSurface;
    const region = args.region ?? correlation?.region ?? '';
    setHeadlessOrderContext(order.providerOrderId, {
      rampSurface,
      region,
    });

    ReduxService.store.dispatch(protectWalletModalVisible());

    const notifyOrderCreated =
      session?.callbacks.onOrderCreated ?? correlation?.onOrderCreated;
    try {
      notifyOrderCreated?.(order.providerOrderId);
    } catch (callbackError) {
      Logger.error(
        callbackError instanceof Error
          ? callbackError
          : new Error(String(callbackError)),
        'externalBrowserReturn: onOrderCreated callback threw',
      );
    }
    if (session) {
      closeSession(sessionId, { reason: 'completed' });
    }
    clearExternalReturnCorrelation(sessionId);
    return order;
  } finally {
    inFlightCompletions.delete(sessionId);
  }
}

function extractOrderIdFromReturnUrl(returnUrl: string): string | undefined {
  try {
    const parsed = new URL(returnUrl);
    return parsed.searchParams.get('orderId') ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Looks up an order (typically the Precreated stub `addPrecreatedOrder`
 * registered at launch) in RampsController state by its normalized order
 * code. The stub is the persisted source of truth for the wallet/provider a
 * return belongs to — the same lookup OrderDetails does via `getOrderById`.
 */
function findOrderInControllerState(orderId: string): RampsOrder | undefined {
  const orderCode = extractOrderCode(orderId);
  try {
    const orders = Engine.context.RampsController.state?.orders ?? [];
    return orders.find(
      (order: RampsOrder) => order.providerOrderId === orderCode,
    );
  } catch {
    return undefined;
  }
}

/**
 * RAMPS_CHECKOUT_CLOSED parity for the external-browser checkout (P2.M7).
 * Emitted for the observable user exit (iOS `openAuth` cancel). Android /
 * system-browser abandonment is unobservable by design (no load or close
 * events reach the app), so no synthetic close is emitted there.
 */
export function emitExternalCheckoutClosed(
  correlation: ExternalReturnCorrelation,
  closeSource: 'external_browser_cancel',
  callbackReached: boolean,
): void {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED,
    )
      .addProperties({
        ...buildBaseProps({
          checkoutSessionId: correlation.analytics.checkoutSessionId,
          providerName: correlation.analytics.providerName,
          rampType: 'HEADLESS',
          rampSurface: correlation.rampSurface,
          region: correlation.region,
        }),
        close_source: closeSource,
        order_id: correlation.orderId ?? undefined,
        callback_reached: callbackReached,
        time_on_screen_ms: Date.now() - correlation.launchedAt,
      })
      .build(),
  );
}

/**
 * RAMPS_ORDER_FAILED parity for the external-browser checkout (P2.M7).
 * Property shape mirrors the in-app Checkout's headless `failHeadlessCheckout`
 * emit so dashboards see one schema for both checkout classes.
 */
export function emitExternalOrderFailed(
  correlation: ExternalReturnCorrelation,
  error: unknown,
): void {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.RAMPS_ORDER_FAILED,
    )
      .addProperties({
        ramp_type: 'HEADLESS',
        ramp_surface: correlation.rampSurface,
        amount_source: correlation.analytics.amountSource ?? 0,
        amount_destination: correlation.analytics.amountDestination ?? 0,
        payment_method_id: correlation.analytics.paymentMethodId ?? '',
        region: correlation.region ?? '',
        chain_id: correlation.analytics.chainId ?? '',
        currency_destination: correlation.analytics.currencyDestination ?? '',
        currency_source: correlation.analytics.currencySource ?? '',
        error_message: error instanceof Error ? error.message : String(error),
        is_authenticated: true,
      })
      .build(),
  );
}

/**
 * Test-only helper. Resets module state between tests.
 */
export function __resetExternalBrowserReturnForTests(): void {
  pendingCorrelations.clear();
  inFlightCompletions.clear();
}
