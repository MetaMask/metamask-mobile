import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictPosition,
} from '../../types';
import { getEntryTitle, getOutcomeName } from '../../utils/entryCopy';
import type { PredictOrderFlowIntent } from './internal/PredictOrderFlowSheet';

/** A buy of one Outcome, from the Event it renders within. */
export const buyIntent = (
  event: PredictEvent,
  market: PredictMarket,
  outcome: PredictOutcome,
): PredictOrderFlowIntent => ({
  action: 'buy',
  eventId: event.id,
  venueId: event.venueId,
  marketId: market.id,
  side: outcome.side,
  outcomeLabel: outcome.label,
  eventTitle: event.title,
  eventImageUrl: event.imageUrl,
  askPrice: outcome.askPrice,
});

/**
 * A Cash Out of one Position, bounded by its whole-contract size. Display
 * context comes from the presented Event when there is one, else from the
 * Position's catalog context.
 */
export const cashOutIntent = (
  position: PredictPosition,
  event?: PredictEvent,
): PredictOrderFlowIntent => {
  const outcome = event?.markets
    .find((market) => market.id === position.marketId)
    ?.outcomes.find((candidate) => candidate.side === position.side);
  return {
    action: 'sell',
    eventId: event ? event.id : position.context?.eventId,
    venueId: position.venueId,
    marketId: position.marketId,
    side: position.side,
    outcomeLabel:
      outcome?.label ?? getOutcomeName(position.side, position.context),
    eventTitle: event ? event.title : getEntryTitle(position.context),
    eventImageUrl: event ? event.imageUrl : position.context?.imageUrl,
    maxContracts: Math.floor(Number(position.shares)),
  };
};
