import BigNumber from 'bignumber.js';
import { useEffect, useState } from 'react';
import { parsePredictDecimal } from '../../../events/shared/formatting';
import type { PredictMarket, PredictOutcome } from '../../../types';
import type { PredictMarketChartPoint } from './PredictMarketChart';

/**
 * Points kept per Outcome. An active Market quotes about once a second, and
 * the chart is a few hundred pixels wide, so older points are dropped rather
 * than grown without bound.
 */
export const PREDICT_LIVE_QUOTE_TRAIL_LIMIT = 240;

const NO_TRAIL: readonly PredictMarketChartPoint[] = [];

type QuotedMarket = Pick<PredictMarket, 'lastPrice' | 'updatedAt'>;

const toTrailPoint = (
  market: QuotedMarket | undefined,
  side: PredictOutcome['side'] | undefined,
): PredictMarketChartPoint | undefined => {
  const yesPrice = parsePredictDecimal(market?.lastPrice);
  if (yesPrice === undefined || side === undefined || !market?.updatedAt) {
    return undefined;
  }

  const time = Date.parse(market.updatedAt);
  if (Number.isNaN(time)) {
    return undefined;
  }

  // `lastPrice` is yes-side, and the two sides of a Market are complementary,
  // which is also how REST history reports `noPrice`.
  const price = side === 'no' ? new BigNumber(1).minus(yesPrice) : yesPrice;
  return { time, value: price.toNumber() };
};

/**
 * Collects one point per quote for an Outcome, keyed on the quote's
 * `updatedAt`, so the line grows as the book moves instead of only its tip
 * changing. The trail starts empty on mount, whenever the Outcome changes, and
 * whenever collecting is turned off and on again; history covers everything
 * before that.
 *
 * Only the live range collects, because the wider ranges span days and would
 * compress a trail of seconds into their final pixel. They stay the REST
 * snapshot they were fetched as.
 *
 * Points come from the quote's last traded price, the same measure REST
 * history plots, so a Market that has never traded contributes none.
 */
export const useLiveQuoteTrail = (
  market: QuotedMarket | undefined,
  outcome: PredictOutcome | undefined,
  isEnabled: boolean,
): readonly PredictMarketChartPoint[] => {
  const [trail, setTrail] =
    useState<readonly PredictMarketChartPoint[]>(NO_TRAIL);
  const outcomeId = outcome?.id;
  const side = outcome?.side;
  const lastPrice = market?.lastPrice;
  const updatedAt = market?.updatedAt;

  useEffect(() => {
    setTrail(NO_TRAIL);
  }, [isEnabled, outcomeId]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const point = toTrailPoint({ lastPrice, updatedAt }, side);
    if (point === undefined) {
      return;
    }

    setTrail((current) => {
      const last = current.at(-1);
      if (last && point.time <= last.time) {
        return current;
      }
      return [...current, point].slice(-PREDICT_LIVE_QUOTE_TRAIL_LIMIT);
    });
  }, [isEnabled, lastPrice, updatedAt, side]);

  // The reset lands after this render, so report nothing the moment collecting
  // stops rather than one frame of the trail the other ranges must not show.
  return isEnabled ? trail : NO_TRAIL;
};

/**
 * Extends a history series with the live trail, dropping points the history
 * already covers so the line never runs backwards.
 */
export const appendLiveQuoteTrail = (
  points: readonly PredictMarketChartPoint[],
  trail: readonly PredictMarketChartPoint[],
): readonly PredictMarketChartPoint[] => {
  const last = points.at(-1);
  const fresh = last
    ? trail.filter(({ time }) => time > last.time)
    : [...trail];

  return fresh.length === 0 ? points : [...points, ...fresh];
};
