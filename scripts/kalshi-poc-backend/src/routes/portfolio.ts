import { Router } from 'express';
import { asyncHandler } from '../util/async.ts';
import { kalshiFetch } from '../kalshi/client.ts';
import { requireUserCredential } from '../kalshi/userCredential.ts';
import { centsToDecimal, contractPriceCentsToProbability } from '../util/decimal.ts';

export const portfolioRouter = Router();

/**
 * All portfolio reads sign with the per-user PEM. Kalshi auto-scopes the
 * response to the ISV sub-account; we never send a `subaccount` field.
 *
 *   GET /predict/v1/kalshi/portfolio/balance?externalUserId=
 *   GET /predict/v1/kalshi/portfolio/positions?externalUserId=
 *   GET /predict/v1/kalshi/portfolio/activity?externalUserId=&cursor=
 */

interface KalshiBalance {
  balance: number; // cents
  payout?: number;
}

interface KalshiPosition {
  ticker: string;
  event_ticker?: string;
  position: number; // signed contracts
  market_exposure?: number;
  total_traded?: number;
  realized_pnl?: number;
  fees_paid?: number;
  resting_orders_count?: number;
  last_updated_ts?: string;
  resolution_value?: string;
}

interface KalshiOrder {
  order_id: string;
  ticker: string;
  status: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  type: string;
  yes_price?: number;
  no_price?: number;
  count?: number;
  remaining_count?: number;
  created_time?: string;
  updated_time?: string;
}

portfolioRouter.get(
  '/balance',
  asyncHandler(async (req, res) => {
    const externalUserId = String(req.query.externalUserId ?? '');
    const { credential } = requireUserCredential(externalUserId);
    const balance = await kalshiFetch<KalshiBalance>({
      credential,
      method: 'GET',
      path: '/trade-api/v2/portfolio/balance',
    });
    res.json({
      venueId: 'kalshi',
      ownerAddress: externalUserId,
      amount: centsToDecimal(balance.balance ?? 0),
    });
  }),
);

portfolioRouter.get(
  '/positions',
  asyncHandler(async (req, res) => {
    const externalUserId = String(req.query.externalUserId ?? '');
    const { credential } = requireUserCredential(externalUserId);
    const data = await kalshiFetch<{ market_positions: KalshiPosition[] }>({
      credential,
      method: 'GET',
      path: '/trade-api/v2/portfolio/positions',
    });
    const positions = (data.market_positions ?? []).map((p) =>
      toPredictPosition(p, externalUserId),
    );
    res.json(positions);
  }),
);

portfolioRouter.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const externalUserId = String(req.query.externalUserId ?? '');
    const { credential } = requireUserCredential(externalUserId);
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const data = await kalshiFetch<{ orders: KalshiOrder[]; cursor: string }>({
      credential,
      method: 'GET',
      path: '/trade-api/v2/portfolio/orders',
      query: { cursor, limit: 50 },
    });
    const items = (data.orders ?? []).map(toActivityItem);
    res.json({ items, cursor: data.cursor ?? null });
  }),
);

function toPredictPosition(p: KalshiPosition, ownerAddress: string): unknown {
  const isLong = (p.position ?? 0) >= 0;
  const sizeShares = Math.abs(p.position ?? 0);
  const isResolved = Boolean(p.resolution_value);
  const won = isResolved && p.resolution_value === (isLong ? 'yes' : 'no');
  const status: 'open' | 'redeemable' | 'won' | 'lost' = isResolved
    ? won
      ? 'won'
      : 'lost'
    : 'open';
  const currentValueCents = p.market_exposure ?? 0;
  const realized = p.realized_pnl ?? 0;
  return {
    id: `${ownerAddress}:${p.ticker}`,
    venueId: 'kalshi',
    eventId: p.event_ticker ?? p.ticker,
    marketId: p.ticker,
    outcomeId: `${p.ticker}:${isLong ? 'yes' : 'no'}`,
    outcomeLabel: isLong ? 'Yes' : 'No',
    currentValue: centsToDecimal(currentValueCents),
    title: p.ticker,
    icon: '',
    amount: centsToDecimal(Math.abs(p.total_traded ?? 0)),
    price: contractPriceCentsToProbability(
      sizeShares > 0 ? Math.round(((p.total_traded ?? 0) / sizeShares) * 1) : 50,
    ),
    status,
    size: String(sizeShares),
    outcomeIndex: isLong ? 0 : 1,
    realizedPnl: centsToDecimal(realized),
    percentPnl: '0.00',
    cashPnl: centsToDecimal(realized),
    claimable: false, // Kalshi settles automatically.
    initialValue: centsToDecimal(Math.abs(p.total_traded ?? 0)),
    averageEntryPrice: '0.50',
    endDate: p.last_updated_ts ?? new Date().toISOString(),
    negRisk: false,
  };
}

function toActivityItem(o: KalshiOrder): unknown {
  const filled = (o.count ?? 0) - (o.remaining_count ?? 0);
  const priceCents = o.side === 'yes' ? o.yes_price ?? 50 : o.no_price ?? 50;
  return {
    id: o.order_id,
    venueId: 'kalshi',
    type: o.action === 'buy' ? 'buy' : 'sell',
    timestamp: o.updated_time ? Date.parse(o.updated_time) : Date.now(),
    marketId: o.ticker,
    outcomeId: `${o.ticker}:${o.side}`,
    amount: centsToDecimal(filled * priceCents),
    price: contractPriceCentsToProbability(priceCents),
    title: o.ticker,
    outcomeLabel: o.side === 'yes' ? 'Yes' : 'No',
  };
}
