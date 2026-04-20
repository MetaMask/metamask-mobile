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

  // Aggregate state
  isLoading: boolean;
  errors: HeadlessBuyErrors;
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
