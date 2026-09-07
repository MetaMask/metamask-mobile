import type { PredictSeries } from '../../../../../UI/Predict/types';
import { BTC_UP_OR_DOWN_5M_SERIES } from '../../../../../UI/Predict/constants/btcUpDown5mSeries';

interface HomepagePredictSeriesSlot {
  type: 'series';
  series: PredictSeries;
}

interface HomepagePredictEventSlot {
  type: 'event';
  id: string;
  slug: string;
}

export type HomepagePredictMarketSlot =
  | HomepagePredictSeriesSlot
  | HomepagePredictEventSlot;

export const HOMEPAGE_PREDICT_SERIES_SLOT = {
  type: 'series',
  series: BTC_UP_OR_DOWN_5M_SERIES,
} as const satisfies HomepagePredictSeriesSlot;

/**
 * Predict homepage market slots for August 31–September 13, 2026.
 *
 * Slot 1 is Polymarket NFL Champion 2027. Kalshi NFL Week 1 was the Sep 1
 * gate candidate; homepage discovery is Polymarket Gamma-only and Kalshi is
 * not enabled, so Slot 1 stays on this event.
 *
 * Slot 3 stays EPL Champion 2027. US Open Men's Winner (id 139236) is live
 * but resolves around Sep 7, which would leave Slot 3 empty for the rest of
 * this window.
 *
 * Polymarket championships are events with one market per team; IDs are
 * queried through the Gamma events endpoint. Event 202857's live slug is
 * `pro-football-2027-champion-20260729185915366` (not the calendar alias
 * `big-game-champion-2027`).
 */
export const HOMEPAGE_PREDICT_MARKET_SLOTS = [
  {
    type: 'event',
    id: '202857',
    slug: 'pro-football-2027-champion-20260729185915366',
  },
  HOMEPAGE_PREDICT_SERIES_SLOT,
  {
    type: 'event',
    id: '659518',
    slug: 'epl-2027-champion-20260701200428749',
  },
] as const satisfies readonly HomepagePredictMarketSlot[];

type HomepagePredictConfiguredSlot =
  (typeof HOMEPAGE_PREDICT_MARKET_SLOTS)[number];

export const isHomepagePredictEventSlot = (
  slot: HomepagePredictConfiguredSlot,
): slot is Extract<HomepagePredictConfiguredSlot, { type: 'event' }> =>
  slot.type === 'event';

export const HOMEPAGE_PREDICT_EVENT_SLOTS =
  HOMEPAGE_PREDICT_MARKET_SLOTS.filter(isHomepagePredictEventSlot);

export const HOMEPAGE_PREDICT_EVENT_QUERY = [
  'active=true',
  'archived=false',
  'closed=false',
  ...HOMEPAGE_PREDICT_EVENT_SLOTS.map(({ id }) => `id=${id}`),
].join('&');
