import BigNumber from 'bignumber.js';
import type { PredictEvent, PredictGame, PredictTeam } from '../../../types';
import {
  createGamePresentation,
  findGameSelectionQuote,
  type GameSelection,
  type GameSelectionQuote,
  type GameStatusLine,
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
  awayProbabilityPercent?: number;
}

const createTeamProjection = (
  event: PredictEvent,
  selection: GameSelection,
  abbreviation: string,
  team: PredictTeam,
): GameCardTeamProjection => {
  const quote = findGameSelectionQuote(event, selection);
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
  const away = parsePredictDecimal(teams.away.quote?.outcome.askPrice);
  const home = parsePredictDecimal(teams.home.quote?.outcome.askPrice);
  const total = away && home ? away.plus(home) : undefined;
  const awayProbabilityPercent =
    away && total?.gt(0)
      ? away.div(total).times(new BigNumber(100)).toNumber()
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
    awayProbabilityPercent,
  };
};
