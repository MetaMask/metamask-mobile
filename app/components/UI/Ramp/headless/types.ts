import {
  RampsOrderStatus,
  type Country,
  type PaymentMethod,
  type Provider,
  type QuotesResponse,
  type RampsOrder,
  type TokensResponse,
  type UserRegion,
} from '@metamask/ramps-controller';
import type { Quote } from '../types';
import type {
  AwaitOrderTerminalStateOptions,
  RefreshOrderOptions,
} from './orderTerminalState';

/**
 * Public input for {@link useHeadlessBuy}'s `getQuotes`.
 *
 * The headless API takes every input explicitly so callers do not need to
 * pre-seed RampsController state before asking for quotes. The hook resolves
 * the wallet address from the currently selected account scope when
 * `walletAddress` is omitted.
 */
export interface HeadlessGetQuotesParams {
  /** CAIP-19 asset id (e.g. `eip155:1/erc20:0x…`). */
  assetId: string;
  /** Fiat amount the user wants to spend. */
  amount: number;
  /** One or more payment method ids the caller is willing to use. */
  paymentMethodIds?: string[];
  /** Filter quotes to a specific set of provider ids. */
  providerIds?: string[];
  /**
   * Override for the wallet that will receive the asset.
   * If omitted the hook resolves it from the selected account group, scoped to
   * the chain extracted from `assetId`.
   */
  walletAddress?: string;
  /** Force a fresh fetch bypassing the controller-side cache. */
  forceRefresh?: boolean;
  /** Override the default redirect URL injected into provider quotes. */
  redirectUrl?: string;
}

/**
 * Per-source error strings returned by the underlying RampsController
 * selectors. Aggregated here so consumers can surface them without depending
 * on the shape of the controller hooks directly.
 */
export interface HeadlessBuyErrors {
  tokens: string | null;
  providers: string | null;
  paymentMethods: string | null;
  countries: string | null;
}

/**
 * The public surface returned by {@link useHeadlessBuy}. This is the contract
 * that external (non-Ramp) UIs build against — the hook is a stable facade,
 * so internal RampsController churn does not leak through it.
 */
export interface HeadlessBuyResult {
  // Catalog data
  tokens: TokensResponse | null;
  providers: Provider[];
  paymentMethods: PaymentMethod[];
  countries: Country[];
  userRegion: UserRegion | null;

  // Orders
  orders: RampsOrder[];
  /**
   * Synchronous read of an order by its provider order id. Accepts either a
   * bare order id or a full `/providers/.../orders/<id>` path.
   *
   * @deprecated since Phase 9. Prefer {@link HeadlessBuyResult.getOrder};
   * `getOrderById` is kept for backwards-compat only and forwards to the
   * same implementation.
   */
  getOrderById: (providerOrderId: string) => RampsOrder | undefined;
  /** Synchronous read of an order. Phase 9 canonical name. */
  getOrder: (providerOrderId: string) => RampsOrder | undefined;
  /**
   * Imperative network refresh — calls the provider via
   * `RampsController.getOrder` and returns the fresh `RampsOrder`. Does not
   * write the result back to redux state. See
   * `headless/orderTerminalState.ts` for the module-level imperative twin.
   */
  refreshOrder: (
    orderIdOrOrder: string | RampsOrder,
    options?: RefreshOrderOptions,
  ) => Promise<RampsOrder>;
  /**
   * Resolves with the order once `status` reaches a terminal state. Used by
   * MMPay's `TransactionPayController` to await fiat order settlement before
   * firing the second step of its two-step flow.
   */
  awaitOrderTerminalState: (
    providerOrderId: string,
    options?: AwaitOrderTerminalStateOptions,
  ) => Promise<RampsOrder>;

  // Imperative
  getQuotes: (params: HeadlessGetQuotesParams) => Promise<QuotesResponse>;
  startHeadlessBuy: (
    params: HeadlessBuyParams,
    callbacks: HeadlessBuyCallbacks,
  ) => StartHeadlessBuyResult;

  // Aggregate state
  isLoading: boolean;
  errors: HeadlessBuyErrors;
}

/**
 * Inputs for {@link HeadlessBuyResult.startHeadlessBuy}.
 *
 * Phase 5 made the headless API quote-first: callers must `getQuotes(...)`
 * themselves, pick one quote, and hand it back here. The Host then drives
 * the rest of the flow off that single quote — no extra controller seeding
 * is needed.
 *
 * @see HeadlessBuyResult.getQuotes for fetching candidate quotes.
 */
export interface HeadlessBuyParams {
  /**
   * The quote returned by `getQuotes(...)` that the consumer wants to
   * continue with. The Host hands this to `useContinueWithQuote` so the
   * provider/payment-method selection comes straight from the quote rather
   * than from the RampsController.
   */
  quote: Quote;
  /**
   * CAIP-19 asset id originally used to request the quote. Re-supplied
   * here because `Quote` itself doesn't carry the asset id, and the Host
   * needs the matching `chainId` to resolve the wallet address.
   */
  assetId: string;
  /**
   * Fiat amount the user is spending. Re-supplied for the same reason as
   * `assetId` — `quote.quote.amountIn` exists but it's typed loosely
   * (`number | string`), and we want a sharp `number` for the
   * `ContinueWithQuoteContext`.
   */
  amount: number;
  /**
   * Fiat currency code (e.g. `'USD'`). When omitted, the Host falls back
   * to the active user region's currency — same default BuildQuote uses.
   */
  currency?: string;
  /**
   * Optional payment method id from the catalog. When omitted, the Host
   * derives it from `quote.quote.paymentMethod` if a match exists in the
   * loaded payment-methods catalog.
   */
  paymentMethodId?: string;
  /**
   * Override the redirect URL injected into provider widget URLs. Defaults
   * to the same `getRampCallbackBaseUrl()` value that BuildQuote uses, so
   * the in-app Checkout WebView can detect "completed" / "fallback" routes
   * the way it does today.
   */
  redirectUrl?: string;
}

/**
 * Lifecycle callbacks invoked by the headless session as it progresses.
 *
 * Stored in the session registry by id; never serialized through navigation.
 */
export interface HeadlessBuyCallbacks {
  /**
   * Fired once the provider produces an `orderId` (aggregator or native).
   *
   * **The headless API does NOT fire `onError` for a created-then-failed
   * order.** After this callback fires, the session terminates via
   * `onClose({ reason: 'completed' })` immediately. Subsequent failures
   * (e.g. a 3-D Secure rejection on a card order) flip the order's
   * `status` to `Failed` with no further callback. Consumers MUST call
   * `awaitOrderTerminalState(orderId)` and branch on the resolved
   * `RampsOrder.status`:
   *
   * - `RampsOrderStatus.Completed` → success path (fire downstream intent).
   * - `RampsOrderStatus.Failed | Cancelled | IdExpired` → failure path
   *   (surface error UI; do NOT fire downstream actions).
   * - `RampsOrderStatus.Unknown` → transient, the helper keeps awaiting.
   *
   * The `order` argument is a **creation snapshot**, not authoritative
   * final state. Its `status` varies by path:
   *
   * | Path | `status` on receipt |
   * |---|---|
   * | Aggregator widget (Transak WebView) | Almost always non-terminal. |
   * | Native card (3-D Secure) | Fresh from `refreshOrder` — usually non-terminal. |
   * | Native bank transfer | May already be terminal (some settle at creation). |
   *
   * So the rule: **always** call `awaitOrderTerminalState(orderId, { walletAddress: order.walletAddress, timeoutMs: 5 * 60 * 1000 })`, regardless of the snapshot's `status`. A reasonable-looking optimization
   * ("skip the await if `status !== 'Pending'`") would silently break the
   * bank-transfer path's success case and the widget path's failure case.
   *
   * @example Asymmetric-callback handling
   * ```ts
   * import {
   *   awaitOrderTerminalState,
   *   AwaitOrderTerminalStatePrerequisitesError,
   *   OrderTerminalStateTimeoutError,
   * } from 'app/components/UI/Ramp/headless';
   * import { RampsOrderStatus } from '@metamask/ramps-controller';
   *
   * onOrderCreated: async (orderId, order) => {
   *   try {
   *     const final = await awaitOrderTerminalState(orderId, {
   *       walletAddress: order.walletAddress,
   *       timeoutMs: 5 * 60 * 1000,
   *     });
   *     if (final.status === RampsOrderStatus.Completed) {
   *       // success path
   *     } else {
   *       // Failed | Cancelled | IdExpired
   *     }
   *   } catch (err) {
   *     if (err instanceof AwaitOrderTerminalStatePrerequisitesError) {
   *       // Consumer-side bug — surface to dev tooling, not user UI.
   *     } else if (err instanceof OrderTerminalStateTimeoutError) {
   *       // Genuine slow provider — show "still processing" UI.
   *     } else {
   *       // Other (controller failure, etc.)
   *     }
   *   }
   * }
   * ```
   */
  onOrderCreated: (orderId: string, order: RampsOrder) => void;
  /** Fired when the session terminates due to an error. */
  onError: (error: HeadlessBuyError) => void;
  /** Fired when the user dismisses or the consumer cancels the session. */
  onClose: (info: HeadlessBuyCloseInfo) => void;
}

/**
 * Typed error surface for headless consumers — replaces toasts/banners that
 * the UI normally renders. Phase 3 only uses `UNKNOWN`; later phases route
 * limit/auth/etc. errors through it.
 */
export type HeadlessBuyErrorCode =
  | 'NO_QUOTES'
  | 'LIMIT_EXCEEDED'
  | 'KYC_REQUIRED'
  | 'AUTH_FAILED'
  | 'QUOTE_FAILED'
  | 'USER_CANCELLED'
  | 'UNKNOWN';

export interface HeadlessBuyError {
  code: HeadlessBuyErrorCode;
  message?: string;
  details?: Record<string, unknown>;
}

/** Reason the session terminated without producing an order. */
export interface HeadlessBuyCloseInfo {
  reason: 'user_dismissed' | 'consumer_cancelled' | 'completed' | 'unknown';
}

/** Optional flags for `closeSession` in `sessionRegistry`. */
export interface CloseSessionOptions {
  /**
   * Registry status written before removal when the session was not already
   * terminal. Defaults to `'cancelled'`. Use `'failed'` after `onError` or
   * other unrecoverable errors so `continued` is not mislabeled as cancelled.
   */
  terminalStatus?: 'cancelled' | 'failed';
}

/** Lifecycle status tracked inside the session registry. */
export type HeadlessSessionStatus =
  | 'pending'
  | 'quoting'
  | 'continued'
  | 'completed'
  | 'cancelled'
  | 'failed';

/**
 * Per-attempt session record kept in the module-level registry. Callbacks are
 * looked up by id at the point of use so they never need to be serialized.
 */
export interface HeadlessSession {
  id: string;
  status: HeadlessSessionStatus;
  params: HeadlessBuyParams;
  callbacks: HeadlessBuyCallbacks;
  createdAt: number;
}

/**
 * Returned by {@link HeadlessBuyResult.startHeadlessBuy} so the consumer can
 * track the session id and trigger a programmatic cancel.
 */
export interface StartHeadlessBuyResult {
  sessionId: string;
  cancel: () => void;
}

export type {
  Country,
  PaymentMethod,
  Provider,
  QuotesResponse,
  RampsOrder,
  TokensResponse,
  UserRegion,
};
export { RampsOrderStatus };
export type {
  AwaitOrderTerminalStateOptions,
  RefreshOrderOptions,
} from './orderTerminalState';
