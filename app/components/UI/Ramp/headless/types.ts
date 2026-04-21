import type {
  Country,
  PaymentMethod,
  Provider,
  QuotesResponse,
  RampsOrder,
  TokensResponse,
  UserRegion,
} from '@metamask/ramps-controller';

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
 * Inputs for {@link HeadlessBuyResult.startHeadlessBuy}. The headless flow
 * pre-seeds the controller with these values and navigates into the existing
 * Ramp v2 stack with a `headlessSessionId` so downstream screens can detect
 * the session.
 */
export interface HeadlessBuyParams {
  /** CAIP-19 asset id (e.g. `eip155:1/erc20:0x…`). */
  assetId: string;
  /** Fiat amount the user wants to spend. */
  amount: number;
  /** The single payment method id to commit to for this attempt. */
  paymentMethodId: string;
  /** Optionally pin the flow to a single provider id. */
  providerId?: string;
  /** Optionally override the active region (otherwise the current user region is used). */
  regionCode?: string;
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
