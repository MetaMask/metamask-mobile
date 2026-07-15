import type {
  ActivityItem,
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
  PredictVenueInfo,
  PredictVenueSession,
  PriceQuery,
} from '../../types';
import { PredictError, PredictErrorCode } from '../../types/errors';
import { KALSHI_CAPABILITIES, KALSHI_VENUE_INFO } from '../../constants/venueConfig';
import { BackendClient } from '../../api/backendClient';
import type {
  ClaimParams,
  CreateDepositPlanParams,
  CreateWithdrawPlanParams,
  FetchEventsParams,
  FetchPositionsParams,
  PreviewParams,
  SubmitOrderParams,
  VenueAdapter,
} from '../types';

/**
 * Remote KalshiAdapter — every method proxies to the POC backend. Because the
 * backend already returns canonical Predict shapes, the adapter is mostly a
 * pass-through. The only mobile-side translation is wrapping outbound params
 * (eg. mapping `tokenAddress` into backend query strings).
 *
 * Session shape: data carries the mobile-supplied externalUserId (the MetaMask
 * EVM address). The backend joins on that to look up the per-user PEM.
 */
export class KalshiAdapter implements VenueAdapter {
  readonly venueId = 'kalshi' as const;
  readonly capabilities = KALSHI_CAPABILITIES;

  constructor(private readonly client: BackendClient) {}

  getVenueInfo(): PredictVenueInfo {
    return KALSHI_VENUE_INFO;
  }

  async createSession(params: {
    ownerAddress: string;
  }): Promise<PredictVenueSession> {
    // POC: session is just the externalUserId. The backend holds the per-user
    // PEM; mobile never sees signing material.
    return {
      venueId: 'kalshi',
      ownerAddress: params.ownerAddress,
      data: { externalUserId: params.ownerAddress },
    };
  }

  async fetchEvents(
    params: FetchEventsParams,
    _session: PredictVenueSession,
  ): Promise<PaginatedResult<PredictEvent>> {
    const query: Record<string, string | undefined> = {};
    if (params.cursor) query.cursor = params.cursor;
    if (params.limit) query.limit = String(params.limit);
    if (params.status) query.status = params.status;
    return this.client.get<PaginatedResult<PredictEvent>>(
      '/predict/v1/kalshi/events',
      query,
    );
  }

  async fetchEvent(
    eventId: string,
    _session: PredictVenueSession,
  ): Promise<PredictEvent> {
    return this.client.get<PredictEvent>(
      `/predict/v1/kalshi/events/${encodeURIComponent(eventId)}`,
    );
  }

  async fetchPrices(
    params: { queries: PriceQuery[] },
    _session: PredictVenueSession,
  ): Promise<MarketPrices> {
    // The POC backend exposes per-market price reads; we fan out and stitch.
    const unique = new Set(params.queries.map((q) => q.marketId));
    const results = (
      await Promise.all(
        Array.from(unique).map((marketId) =>
          this.client.get<MarketPrices>(
            `/predict/v1/kalshi/markets/${encodeURIComponent(marketId)}/prices`,
          ),
        ),
      )
    ).flatMap((m) => m.results);
    return { venueId: 'kalshi', results };
  }

  async fetchBalance(session: PredictVenueSession): Promise<PredictBalance> {
    this.bindUser(session);
    return this.client.get<PredictBalance>('/predict/v1/kalshi/portfolio/balance');
  }

  async fetchPositions(
    _params: FetchPositionsParams,
    session: PredictVenueSession,
  ): Promise<PredictPosition[]> {
    this.bindUser(session);
    return this.client.get<PredictPosition[]>(
      '/predict/v1/kalshi/portfolio/positions',
    );
  }

  async fetchActivity(
    params: { cursor?: string },
    session: PredictVenueSession,
  ): Promise<PaginatedResult<ActivityItem>> {
    this.bindUser(session);
    return this.client.get<PaginatedResult<ActivityItem>>(
      '/predict/v1/kalshi/portfolio/activity',
      params.cursor ? { cursor: params.cursor } : undefined,
    );
  }

  async fetchAccountReadiness(
    _params: { forceRefresh?: boolean } | undefined,
    session: PredictVenueSession,
  ): Promise<PredictAccountReadiness> {
    this.bindUser(session);
    return this.client.get<PredictAccountReadiness>(
      '/predict/v1/kalshi/account/readiness',
    );
  }

  async getOrderPreview(
    params: PreviewParams,
    session: PredictVenueSession,
  ): Promise<OrderPreview> {
    this.bindUser(session);
    return this.client.post<OrderPreview>('/predict/v1/kalshi/orders/preview', params);
  }

  async submitOrder(
    params: SubmitOrderParams,
    session: PredictVenueSession,
  ): Promise<OrderReceipt> {
    this.bindUser(session);
    return this.client.post<OrderReceipt>('/predict/v1/kalshi/orders/submit', params);
  }

  async createDepositPlan(
    params: CreateDepositPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan> {
    this.bindUser(session);
    return this.client.post<FundingPlan>('/predict/v1/kalshi/funding/deposit/prepare', {
      amount: params.amount,
      network: 'base',
    });
  }

  async createWithdrawPlan(
    params: CreateWithdrawPlanParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan> {
    this.bindUser(session);
    // For Kalshi the backend does register-then-withdraw atomically; the
    // returned plan already carries the resulting transfer_id as
    // `venueReference`. No separate submit step is needed — the canonical
    // contract treats this as `venue_api` with the operation already
    // initiated.
    const receipt = await this.client.post<{
      venueReference: string;
      amount: string;
      status: string;
    }>('/predict/v1/kalshi/funding/withdraw/submit', {
      amount: params.amount,
      destinationAddress: params.destinationAddress,
      network: 'base',
    });
    return {
      kind: 'venue_api',
      venueId: 'kalshi',
      operation: 'withdraw',
      amount: receipt.amount,
      requestPreview: {
        destinationAddress: params.destinationAddress,
        network: 'base',
      },
      venueReference: receipt.venueReference,
    };
  }

  async createClaimPlan(
    _params: ClaimParams,
    _session: PredictVenueSession,
  ): Promise<FundingPlan> {
    // Kalshi settles automatically: claims are unsupported by design.
    throw new PredictError(
      PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY,
      'Kalshi settles automatically; manual claims are not supported',
    );
  }

  async submitFundingFollowUp(
    receipt: FundingReceipt,
    session: PredictVenueSession,
  ): Promise<FundingReceipt> {
    this.bindUser(session);
    if (receipt.operation === 'deposit') {
      return this.client.post<FundingReceipt>(
        '/predict/v1/kalshi/funding/deposit/submit',
        {
          venueReference: receipt.venueReference,
          txHash: receipt.txHash,
          amount: receipt.amount,
        },
      );
    }
    // No follow-up step for venue_api withdrawals.
    return receipt;
  }

  /** Bind the session externalUserId onto the shared BackendClient before each call. */
  private bindUser(session: PredictVenueSession): void {
    const externalUserId =
      typeof session.data === 'object' && session.data !== null && 'externalUserId' in session.data
        ? (session.data as { externalUserId: string }).externalUserId
        : session.ownerAddress;
    this.client.setExternalUserId(externalUserId);
  }
}
