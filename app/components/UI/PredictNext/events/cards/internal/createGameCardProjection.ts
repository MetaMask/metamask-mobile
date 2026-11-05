import BigNumber from 'bignumber.js';
import type { PredictEvent, PredictGame, PredictTeam } from '../../../types';
import {
  createGamePresentation,
  findGameTradingQuote,
  getGameTeamOrder,
  type GameSelection,
  type GameSelectionQuote,
  type GameStatusLine,
  type GameTeamOrder,
} from '../../game';
import {
  formatAskPrice,
  getAskPricePercent,
  parsePredictDecimal,
} from '../../shared/formatting';
import { formatMultiplier } from './formatMultiplier';

export type { GameSelection };
export type GameCardQuote = GameSelectionQuote;

export interface GameCardTeamProjection {
  team: PredictTeam;
  quote?: GameCardQuote;
  abbreviation: string;
  formattedPrice?: string;
  multiplier?: string;
  percent?: number;
  canOrder: boolean;
}

export interface GameCardProjection {
  teams: Record<GameSelection, GameCardTeamProjection>;
  status: Record<'compact' | 'featured', GameStatusLine>;
  hiddenMarketCount: number;
  /** The order the card lists Teams in, from the Game. */
  teamOrder: GameTeamOrder;
  /** The first Team's share of the two Team prices, as a percent. */
  firstTeamProbabilityPercent?: number;
}

const createTeamProjection = (
  event: PredictEvent,
  selection: GameSelection,
  abbreviation: string,
  team: PredictTeam,
): GameCardTeamProjection => {
  // The Team control's quote trades the Yes side of the selection's winner
  // Market; the Game Selection tag itself is chart association only.
  const quote = findGameTradingQuote(event, selection);
  const formattedPrice = formatAskPrice(quote?.outcome.askPrice);

  return {
    team,
    quote,
    abbreviation,
    formattedPrice,
    multiplier: formatMultiplier(quote?.outcome.askPrice),
    percent: getAskPricePercent(quote?.outcome.askPrice),
    canOrder: Boolean(formattedPrice && quote?.market.status === 'active'),
  };
};

export const createGameCardProjection = (
  event: PredictEvent,
  game: PredictGame,
): GameCardProjection => {
  const presentation = createGamePresentation(event, game);
  const teams = {
    away: createTeamProjection(
      event,
      'away',
      presentation.teams.away.abbreviation,
      presentation.teams.away.team,
    ),
    home: createTeamProjection(
      event,
      'home',
      presentation.teams.home.abbreviation,
      presentation.teams.home.team,
    ),
  };
  const representedMarkets = new Set(
    Object.values(teams)
      .filter((team) => team.formattedPrice)
      .map((team) => team.quote?.market.id),
  );
  const teamOrder = getGameTeamOrder(game);
  const [firstSelection, secondSelection] = teamOrder;
  const first = parsePredictDecimal(
    teams[firstSelection].quote?.outcome.askPrice,
  );
  const second = parsePredictDecimal(
    teams[secondSelection].quote?.outcome.askPrice,
  );
  const total = first && second ? first.plus(second) : undefined;
  const firstTeamProbabilityPercent =
    first && total?.gt(0)
      ? first.div(total).times(new BigNumber(100)).toNumber()
      : undefined;

  return {
    teams,
    status: {
      compact: presentation.status.compact,
      featured: presentation.status.featured,
    },
    hiddenMarketCount: event.markets.filter(
      (market) => !representedMarkets.has(market.id),
    ).length,
    teamOrder,
    firstTeamProbabilityPercent,
  };
};
