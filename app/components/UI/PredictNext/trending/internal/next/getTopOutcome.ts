import { findGameSelectionQuote, getEventGame } from '../../../events/game';
import { getAskPricePercent } from '../../../events/shared/formatting';
import { isOutcomeTradeable } from '../../../events/shared/tradeable';
import type {
  PredictEvent,
  PredictGameSelection,
  PredictTeam,
} from '../../../types';

/** The most likely Outcome of an Event, as a search row names it. */
export interface TopOutcome {
  /** The Outcome's chance in percent, from its Ask Price. */
  percent: number;
  label: string;
  /** The Team the Outcome backs, for a Game's moneyline. */
  team?: PredictTeam;
}

const GAME_SELECTIONS: readonly Exclude<PredictGameSelection, 'draw'>[] = [
  'away',
  'home',
];

const pickHighest = (candidates: TopOutcome[]): TopOutcome | undefined =>
  candidates.reduce<TopOutcome | undefined>(
    (best, candidate) =>
      !best || candidate.percent > best.percent ? candidate : best,
    undefined,
  );

/**
 * The Outcome a search row shows as "{percent} chance on {label}", like the
 * Polymarket row: the tradeable Outcome with the highest Ask Price. A Game
 * names the Team its full-game moneyline backs; a single-Market Event names
 * the Market's question; any other Event names the Yes Outcome of each
 * Market. Undefined when no Outcome has a current buy quote.
 */
export const getTopOutcome = (event: PredictEvent): TopOutcome | undefined => {
  const game = getEventGame(event);
  if (game) {
    return pickHighest(
      GAME_SELECTIONS.flatMap((selection) => {
        const quote = findGameSelectionQuote(event, selection);
        const percent = getAskPricePercent(quote?.outcome.askPrice);
        if (
          !quote ||
          percent === undefined ||
          !isOutcomeTradeable(quote.market, quote.outcome)
        ) {
          return [];
        }
        const team = selection === 'home' ? game.homeTeam : game.awayTeam;
        return [{ percent, label: team.name, team }];
      }),
    );
  }

  const isSingleMarket = event.markets.length === 1;
  return pickHighest(
    event.markets.flatMap((market) => {
      const yes = market.outcomes.find(({ side }) => side === 'yes');
      const percent = getAskPricePercent(yes?.askPrice);
      if (!yes || percent === undefined || !isOutcomeTradeable(market, yes)) {
        return [];
      }
      return [{ percent, label: isSingleMarket ? market.question : yes.label }];
    }),
  );
};
