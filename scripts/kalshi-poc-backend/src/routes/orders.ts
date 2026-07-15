import { Router } from 'express';
import { asyncHandler } from '../util/async.ts';
import { kalshiFetch } from '../kalshi/client.ts';
import { requireUserCredential } from '../kalshi/userCredential.ts';
import {
  centsToDecimal,
  contractPriceCentsToProbability,
  probabilityToContractPriceCents,
  type DecimalString,
} from '../util/decimal.ts';
import { config } from '../config.ts';

export const ordersRouter = Router();

/**
 * Order endpoints:
 *
 *   POST /predict/v1/kalshi/orders/preview
 *     { externalUserId, eventId, marketId, outcomeId, side: 'buy'|'sell', size }
 *     → canonical OrderPreview (price × size + Kalshi fee model).
 *
 *   POST /predict/v1/kalshi/orders/submit
 *     { externalUserId, preview, slippageBps? }
 *     → OrderReceipt
 *
 *   POST /predict/v1/kalshi/orders/cancel
 *     { externalUserId, orderId }
 *     → { cancelled: boolean }
 *
 * We never send a `subaccount` field — Kalshi auto-scopes by api_key.
 *
 * Kalshi fee model (from public docs): per-contract fee = 0.07 × price × (1-price)
 * rounded up to the next cent. We compute the same value server-side so the
 * preview is fully deterministic from current market price + size.
 */

const METAMASK_FEE_RATE_BPS = 0; // POC: no MetaMask fee surcharge.

interface KalshiV2Market {
  ticker: string;
  event_ticker: string;
  yes_ask?: number;
  yes_bid?: number;
  no_ask?: number;
  no_bid?: number;
  last_price?: number;
}

ordersRouter.post(
  '/preview',
  asyncHandler(async (req, res) => {
    const { externalUserId, eventId, marketId, outcomeId, side, size } = req.body ?? {};
    if (!externalUserId || !marketId || !outcomeId || !side || !size) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'missing preview params' },
      });
      return;
    }
    requireUserCredential(externalUserId);

    const yesOutcome = String(outcomeId).endsWith(':yes');
    const market = await fetchPublicMarket(marketId);
    const priceCents = pickQuotePrice(market, yesOutcome, side);
    const priceProbability: DecimalString = contractPriceCentsToProbability(priceCents);

    // Buy "size" is interpreted as a settlement-currency amount; we floor to whole contracts.
    // Sell "size" is interpreted as share count.
    let contracts: number;
    let maxSpentCents: number;
    let minReceivedShares: number;
    if (side === 'buy') {
      const dollars = Number(size);
      maxSpentCents = Math.round(dollars * 100);
      contracts = Math.max(0, Math.floor(maxSpentCents / Math.max(1, priceCents)));
      minReceivedShares = contracts;
    } else {
      contracts = Math.floor(Number(size));
      minReceivedShares = contracts;
      maxSpentCents = contracts * priceCents;
    }

    const venueFeeCents = computeKalshiFeeCents(priceCents, contracts);
    const totalFeeCents = venueFeeCents; // POC: no MetaMask fee.
    res.json({
      eventId: eventId ?? market.event_ticker,
      marketId,
      outcomeId,
      timestamp: Date.now(),
      side,
      sharePrice: priceProbability,
      maxAmountSpent: side === 'buy' ? centsToDecimal(maxSpentCents + totalFeeCents) : String(contracts),
      minAmountReceived: side === 'buy' ? String(minReceivedShares) : centsToDecimal(maxSpentCents - totalFeeCents),
      slippage: '0.00',
      tickSize: '0.01',
      minOrderSize: '1',
      negRisk: false,
      feeRateBps: String(METAMASK_FEE_RATE_BPS),
      fees: {
        metamaskFee: '0.00',
        venueFee: centsToDecimal(venueFeeCents),
        totalFee: centsToDecimal(totalFeeCents),
        totalFeePercentage: contracts > 0 && priceCents > 0
          ? ((totalFeeCents / (priceCents * contracts)) * 100).toFixed(2)
          : '0.00',
      },
      orderType: 'FAK',
    });
  }),
);

ordersRouter.post(
  '/submit',
  asyncHandler(async (req, res) => {
    const { externalUserId, preview, slippageBps } = req.body ?? {};
    if (!externalUserId || !preview) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'missing externalUserId or preview' },
      });
      return;
    }
    const { credential } = requireUserCredential(externalUserId);

    const ticker: string = preview.marketId;
    const isYes = String(preview.outcomeId).endsWith(':yes');
    const isBuy = preview.side === 'buy';
    const priceCents = probabilityToContractPriceCents(preview.sharePrice);
    // Translate preview min/max amounts back into Kalshi units.
    let count: number;
    if (isBuy) {
      count = Number(preview.minAmountReceived); // shares received on a buy
    } else {
      count = Number(preview.maxAmountSpent); // shares sold on a sell
    }
    if (!Number.isFinite(count) || count <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'preview produced 0 contracts' },
      });
      return;
    }

    const order = await kalshiFetch<{ order: KalshiSubmittedOrder }>({
      credential,
      method: 'POST',
      path: '/trade-api/v2/portfolio/orders',
      body: {
        action: isBuy ? 'buy' : 'sell',
        side: isYes ? 'yes' : 'no',
        ticker,
        type: 'limit',
        count,
        [isYes ? 'yes_price' : 'no_price']: priceCents,
        time_in_force: 'fill_or_kill',
        client_order_id: `mm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        // intentionally no `subaccount` field.
      },
    });

    const submitted = order.order;
    void slippageBps; // POC: ignored, FOK is its own slippage protection.

    res.json({
      orderId: submitted.order_id,
      status: mapOrderStatus(submitted.status),
      venueOrderId: submitted.order_id,
      spentAmount: centsToDecimal(((submitted.count ?? count) - (submitted.remaining_count ?? 0)) * priceCents),
      receivedAmount: String((submitted.count ?? count) - (submitted.remaining_count ?? 0)),
      txHashes: [],
    });
  }),
);

ordersRouter.post(
  '/cancel',
  asyncHandler(async (req, res) => {
    const { externalUserId, orderId } = req.body ?? {};
    if (!externalUserId || !orderId) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'externalUserId + orderId required' },
      });
      return;
    }
    const { credential } = requireUserCredential(externalUserId);
    await kalshiFetch({
      credential,
      method: 'DELETE',
      path: `/trade-api/v2/portfolio/orders/${encodeURIComponent(orderId)}`,
    });
    res.json({ cancelled: true });
  }),
);

interface KalshiSubmittedOrder {
  order_id: string;
  status: string;
  count?: number;
  remaining_count?: number;
}

function mapOrderStatus(status: string): 'submitted' | 'filled' | 'partially_filled' {
  switch (status) {
    case 'executed':
    case 'filled':
      return 'filled';
    case 'resting':
    case 'pending':
    case 'open':
      return 'submitted';
    default:
      return 'partially_filled';
  }
}

async function fetchPublicMarket(ticker: string): Promise<KalshiV2Market> {
  const url = new URL(config.kalshi.baseUrl + `/trade-api/v2/markets/${encodeURIComponent(ticker)}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`market fetch ${res.status}`);
  }
  const data = (await res.json()) as { market: KalshiV2Market };
  return data.market;
}

function pickQuotePrice(market: KalshiV2Market, yes: boolean, side: 'buy' | 'sell'): number {
  if (side === 'buy') {
    return yes ? market.yes_ask ?? market.last_price ?? 50 : market.no_ask ?? 50;
  }
  return yes ? market.yes_bid ?? market.last_price ?? 50 : market.no_bid ?? 50;
}

/**
 * Kalshi's published per-contract fee: round_up(0.07 * price * (1 - price) * count).
 * price here is dollars (0-1), count is contracts.
 */
function computeKalshiFeeCents(priceCents: number, count: number): number {
  if (count <= 0 || priceCents <= 0 || priceCents >= 100) return 0;
  const priceDollars = priceCents / 100;
  const perContract = Math.ceil(0.07 * priceDollars * (1 - priceDollars) * 100); // cents
  return Math.max(0, perContract * count);
}
