import type {
  Country,
  PaymentMethod,
  Provider,
  QuotesResponse,
  RampsOrder,
  TokensResponse,
  UserRegion,
} from '@metamask/ramps-controller';
import type { Quote } from '../types';

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
  getOrderById: (providerOrderId: string) => RampsOrder | undefined;

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
  /** Fired once the provider produces an `orderId` (aggregator or native). */
  onOrderCreated: (orderId: string) => void;
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
export interface HeadlessBuyError {
  code:
    | 'NO_QUOTES'
    | 'LIMIT_EXCEEDED'
    | 'KYC_REQUIRED'
    | 'AUTH_FAILED'
    | 'QUOTE_FAILED'
    | 'USER_CANCELLED'
    | 'UNKNOWN';
  message?: string;
  details?: Record<string, unknown>;
}

/** Reason the session terminated without producing an order. */
export interface HeadlessBuyCloseInfo {
  reason: 'user_dismissed' | 'consumer_cancelled' | 'completed' | 'unknown';
}

/** Lifecycle status tracked inside the session registry. */
export type HeadlessSessionStatus =
  | 'pending'
  | 'quoting'
  | 'continued'
  | 'completed'
  | 'cancelled';

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
