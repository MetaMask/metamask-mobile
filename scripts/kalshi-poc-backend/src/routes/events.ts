import { Router } from 'express';
import { asyncHandler } from '../util/async.ts';
import { config } from '../config.ts';
import {
  centsToDecimal,
  contractPriceCentsToProbability,
  type DecimalString,
} from '../util/decimal.ts';

export const eventsRouter = Router();

/**
 * Event / market discovery uses Kalshi's public v2 market-data API. These
 * endpoints are unauthenticated on Kalshi demo; we proxy without signing so
 * the mobile adapter can browse markets pre-KYC.
 *
 *   GET /predict/v1/kalshi/events?cursor=&status=&limit=
 *   GET /predict/v1/kalshi/events/:id
 *   GET /predict/v1/kalshi/markets/:ticker/prices
 *
 * The :id parameter is a Kalshi event_ticker (e.g. "KXNBA-25APR15-LAL").
 * Prices are read off the v2 /markets endpoint (yes_bid/ask, no_bid/ask).
 */

interface KalshiV2Market {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  status: string;
  open_time?: string;
  close_time?: string;
  expiration_time?: string;
  yes_ask_dollars?: string;
  yes_bid_dollars?: string;
  no_ask_dollars?: string;
  no_bid_dollars?: string;
  last_price_dollars?: string;
  volume_fp?: string;
  liquidity_dollars?: string;
  result?: string;
  can_close_early?: boolean;
}

interface KalshiV2Event {
  event_ticker: string;
  series_ticker?: string;
  title: string;
  sub_title?: string;
  category?: string;
  markets?: KalshiV2Market[];
}

async function publicGet<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(config.kalshi.baseUrl + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url);
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`kalshi public ${res.status}: ${text}`);
  }
  return parsed as T;
}

eventsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { cursor, limit, status } = req.query as Record<string, string | undefined>;
    const data = await publicGet<{ events: KalshiV2Event[]; cursor: string }>(
      '/trade-api/v2/events',
      {
        cursor,
        limit: limit ?? 50,
        status: status ?? 'open',
        series_ticker: 'KXHIGHNY',
        with_nested_markets: 'true',
      },
    );
    const events = data.events.map(toPredictEvent);
    res.json({ items: events, cursor: data.cursor ?? null });
  }),
);

eventsRouter.get(
  '/:eventTicker',
  asyncHandler(async (req, res) => {
    const data = await publicGet<{ event: KalshiV2Event; markets?: KalshiV2Market[] }>(
      `/trade-api/v2/events/${encodeURIComponent(req.params.eventTicker)}`,
      { with_nested_markets: 'true' },
    );
    const event = data.event;
    if (data.markets && (!event.markets || event.markets.length === 0)) {
      event.markets = data.markets;
    }
    res.json(toPredictEvent(event));
  }),
);

/**
 * GET /predict/v1/kalshi/markets/:ticker/prices
 * Returns canonical PriceResult shape: { buy, sell } per outcome.
 */
eventsRouter.get(
  '/:marketTicker/prices',
  asyncHandler(async (req, res) => {
    const data = await publicGet<{ market: KalshiV2Market }>(
      `/trade-api/v2/markets/${encodeURIComponent(req.params.marketTicker)}`,
    );
    const m = data.market;
    res.json({
      venueId: 'kalshi',
      results: [
        {
          eventId: m.event_ticker,
          marketId: m.ticker,
          outcomeId: `${m.ticker}:yes`,
          buy: contractPriceCentsToProbability(m.yes_ask ?? 50),
          sell: contractPriceCentsToProbability(m.yes_bid ?? 50),
        },
        {
          eventId: m.event_ticker,
          marketId: m.ticker,
          outcomeId: `${m.ticker}:no`,
          buy: contractPriceCentsToProbability(m.no_ask ?? 50),
          sell: contractPriceCentsToProbability(m.no_bid ?? 50),
        },
      ],
    });
  }),
);

function toPredictEvent(event: KalshiV2Event): unknown {
  const markets = (event.markets ?? []).map((m) => toPredictMarket(m, event.event_ticker));
  const volume = markets.reduce((sum: number, m: { volume: DecimalString }) => sum + Number(m.volume), 0);
  const liquidity = markets.reduce(
    (sum: number, m: { liquidity?: DecimalString }) => sum + Number(m.liquidity ?? 0),
    0,
  );
  return {
    id: event.event_ticker,
    venueId: 'kalshi',
    slug: event.event_ticker,
    title: event.title,
    description: event.sub_title,
    status: 'open',
    category: event.category,
    tags: event.series_ticker ? [event.series_ticker] : [],
    markets,
    liquidity: liquidity.toFixed(2),
    volume: volume.toFixed(2),
  };
}

function toPredictMarket(m: KalshiV2Market, eventId: string): {
  id: string;
  venueId: 'kalshi';
  eventId: string;
  title: string;
  description?: string;
  status: string;
  acceptingOrders: boolean;
  outcomes: Array<{ id: string; label: string; price: DecimalString }>;
  volume: DecimalString;
  liquidity?: DecimalString;
  tickSize: string;
  negRisk: boolean;
  resolvedBy?: string;
} {
  const parseCents = (d?: string) => d !== undefined ? Math.round(parseFloat(d) * 100) : undefined;
  // _dollars = "0.0000" or "1.0000" both signal no ask liquidity on that side
  const validAsk = (c?: number) => (c !== undefined && c > 0 && c < 100) ? c : undefined;
  const yesAsk = validAsk(parseCents(m.yes_ask_dollars));
  const noAsk = validAsk(parseCents(m.no_ask_dollars));
  const last = parseCents(m.last_price_dollars);
  const yesPrice = yesAsk ?? last ?? 50;
  const noPrice = noAsk ?? (last !== undefined ? 100 - last : 100 - yesPrice);
  return {
    id: m.ticker,
    venueId: 'kalshi',
    eventId,
    title: m.yes_sub_title ?? m.title,
    description: m.subtitle,
    status: mapMarketStatus(m.status),
    acceptingOrders: m.status === 'active',
    outcomes: [
      {
        id: `${m.ticker}:yes`,
        label: 'Yes',
        price: contractPriceCentsToProbability(yesPrice),
      },
      {
        id: `${m.ticker}:no`,
        label: 'No',
        price: contractPriceCentsToProbability(noPrice),
      },
    ],
    volume: m.volume_fp ?? '0.00',
    liquidity: m.liquidity_dollars ?? '0.00',
    tickSize: '0.01',
    negRisk: false,
    resolvedBy: m.result,
  };
}

function mapMarketStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'open';
    case 'initialized':
      return 'upcoming';
    case 'closed':
      return 'closed';
    case 'settled':
      return 'settled';
    case 'finalized':
      return 'resolved';
    default:
      return 'open';
  }
}
