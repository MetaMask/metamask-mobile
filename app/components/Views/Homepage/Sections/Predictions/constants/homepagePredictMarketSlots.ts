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

/**
 * Predict homepage market slots for August 17–30, 2026.
 *
 * Polymarket represents the championship selections as events containing one
 * market per team, so their IDs are queried through the Gamma events endpoint.
 */
export const HOMEPAGE_PREDICT_EVENT_SLOTS = [
  {
    type: 'event',
    id: '659518',
    slug: 'epl-2027-champion-20260701200428749',
  },
  {
    type: 'event',
    id: '659548',
    slug: 'laliga-2027-champion-20260701200737375',
  },
  {
    type: 'event',
    id: '681261',
    slug: 'bundesliga-2027-champion-20260708164840303',
  },
  {
    type: 'event',
    id: '659488',
    slug: 'serie-a-2027-champion-20260701200118390',
  },
] as const satisfies readonly HomepagePredictEventSlot[];

export const HOMEPAGE_PREDICT_SERIES_SLOT = {
  type: 'series',
  series: BTC_UP_OR_DOWN_5M_SERIES,
} as const satisfies HomepagePredictSeriesSlot;

export const HOMEPAGE_PREDICT_MARKET_SLOTS = [
  HOMEPAGE_PREDICT_SERIES_SLOT,
  ...HOMEPAGE_PREDICT_EVENT_SLOTS,
] as const satisfies readonly HomepagePredictMarketSlot[];

export const HOMEPAGE_PREDICT_EVENT_QUERY = [
  'active=true',
  'archived=false',
  'closed=false',
  ...HOMEPAGE_PREDICT_EVENT_SLOTS.map(({ id }) => `id=${id}`),
].join('&');
