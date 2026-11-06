import { strings } from '../../../../../../../locales/i18n';
import { formatThresholdLine } from '../../../events/shared/formatting';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictPosition,
} from '../../../types';
import { getEntryTitle, getOutcomeName } from '../../../utils/entryCopy';
import type { PredictOrderFlowIntent } from './PredictOrderFlowSheet';

/**
 * The Outcome as the Order sheet names it. A threshold line's Outcome is just
 * "Yes" or "No", so it also names the line: "Yes · Josh Jacobs · 60+".
 */
const orderOutcomeLabel = (
  market: PredictMarket,
  outcome: PredictOutcome,
): string => {
  const line = formatThresholdLine(market);
  return line
    ? strings('predict.market_groups.threshold_order_outcome', {
        outcome: outcome.label,
        line,
      })
    : outcome.label;
};

export const toBuyIntent = (
  event: PredictEvent,
  market: PredictMarket,
  outcome: PredictOutcome,
): PredictOrderFlowIntent => ({
  action: 'buy',
  eventId: event.id,
  venueId: event.venueId,
  marketId: market.id,
  side: outcome.side,
  outcomeLabel: orderOutcomeLabel(market, outcome),
  eventTitle: event.title,
  eventImageUrl: event.imageUrl,
  askPrice: outcome.askPrice,
});

/**
 * A Cash Out: a sell bounded by the Position's whole-contract size. The
 * presented Event, when there is one, names and prices the held Outcome;
 * otherwise the Position's catalog context does.
 */
export const toCashOutIntent = (
  position: PredictPosition,
  event?: PredictEvent,
): PredictOrderFlowIntent => {
  const market = event?.markets.find(
    (candidate) => candidate.id === position.marketId,
  );
  const outcome = market?.outcomes.find(
    (candidate) => candidate.side === position.side,
  );
  return {
    action: 'sell',
    eventId: event?.id ?? position.context?.eventId,
    venueId: position.venueId,
    marketId: position.marketId,
    side: position.side,
    outcomeLabel:
      market && outcome
        ? orderOutcomeLabel(market, outcome)
        : getOutcomeName(position.side, position.context),
    eventTitle: event?.title ?? getEntryTitle(position.context),
    eventImageUrl: event ? event.imageUrl : position.context?.imageUrl,
    bidPrice: outcome?.bidPrice,
    maxContracts: Math.floor(Number(position.shares)),
  };
};
