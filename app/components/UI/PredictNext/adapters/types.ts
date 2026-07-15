import type {
  ActivityItem,
  ChainNamespace,
  DecimalString,
  FundingPlan,
  FundingReceipt,
  MarketPrices,
  OrderPreview,
  OrderReceipt,
  PaginatedResult,
  PredictAccountReadiness,
  PredictBalance,
  PredictEvent,
  PredictPosition,
  PredictSigner,
  PredictVenueId,
  PredictVenueInfo,
  PredictVenueSession,
  PriceQuery,
  VenueCapabilities,
} from '../types';

export type Unsubscribe = () => void;

export interface FetchEventsParams {
  cursor?: string | null;
  status?: 'upcoming' | 'live' | 'open' | 'closed' | 'resolved';
  limit?: number;
}

export interface FetchPositionsParams {
  limit?: number;
  cursor?: string;
}

export interface PreviewParams {
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  size: DecimalString;
  positionId?: string;
}

export interface SubmitOrderParams {
  preview: OrderPreview;
  slippageBps?: number;
}

export type CreateDepositPlanParams = {
  tokenAddress?: string;
  mode: 'fixed-amount';
  amount: DecimalString;
  destinationAddress?: string;
  network?: ChainNamespace;
};

export type CreateWithdrawPlanParams = {
  tokenAddress?: string;
  mode: 'fixed-amount';
  amount: DecimalString;
  destinationAddress: string;
  network?: ChainNamespace;
};

export interface ClaimParams {
  positions: PredictPosition[];
}

/**
 * Canonical VenueAdapter contract. The POC implementation `KalshiAdapter` is
 * a remote adapter — every method below proxies through the stub backend.
 *
 * `PredictClient` (the session-bound view product services hold) is derived
 * from this type by stripping the trailing `session` parameter; see the
 * service-side proxy in `session/PredictSessionService.ts`.
 */
export interface VenueAdapter {
  readonly venueId: PredictVenueId;
  readonly capabilities: VenueCapabilities;

  getVenueInfo(): PredictVenueInfo;

  createSession(params: {
    ownerAddress: string;
    signer?: PredictSigner;
  }): Promise<PredictVenueSession>;

  fetchEvents(
    params: FetchEventsParams,
    session: PredictVenueSession,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEvent(
    eventId: string,
    session: PredictVenueSession,
  ): Promise<PredictEvent>;
  fetchPrices(
    params: { queries: PriceQuery[] },
    session: PredictVenueSession,
  ): Promise<MarketPrices>;

  getOrderPreview(
    params: PreviewParams,
    session: PredictVenueSession,
  ): Promise<OrderPreview>;
  fetchPositions(
    params: FetchPositionsParams,
    session: PredictVenueSession,
  ): Promise<PredictPosition[]>;
  fetchActivity(
    params: { cursor?: string },
    session: PredictVenueSession,
  ): Promise<PaginatedResult<ActivityItem>>;
  fetchBalance(session: PredictVenueSession): Promise<PredictBalance>;
  fetchAccountReadiness(
    params: { forceRefresh?: boolean } | undefined,
    session: PredictVenueSession,
  ): Promise<PredictAccountReadiness>;

  submitOrder(
    params: SubmitOrderParams,
    session: PredictVenueSession,
  ): Promise<OrderReceipt>;
  createDepositPlan(
    params: CreateDepositPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  createWithdrawPlan(
    params: CreateWithdrawPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  createClaimPlan(
    params: ClaimParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;
  submitFundingFollowUp(
    receipt: FundingReceipt,
    session: PredictVenueSession,
  ): Promise<FundingReceipt>;
}

/**
 * Session-bound view of `VenueAdapter`. Derived: stripping the trailing
 * `session` parameter from every method.
 */
type StripSession<T> = T extends (
  ...args: [...infer Rest, PredictVenueSession]
) => infer R
  ? (...args: Rest) => R
  : T;

export type PredictClient = {
  readonly venueId: VenueAdapter['venueId'];
  readonly capabilities: VenueAdapter['capabilities'];
} & {
  [K in keyof VenueAdapter as VenueAdapter[K] extends (...args: never[]) => unknown
    ? K
    : never]: StripSession<VenueAdapter[K]>;
};
