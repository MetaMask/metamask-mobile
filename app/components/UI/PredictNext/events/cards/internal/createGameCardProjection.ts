import BigNumber from 'bignumber.js';
import type {
  PredictEvent,
  PredictGame,
  PredictMarket,
  PredictOutcome,
  PredictTeam,
} from '../../../types';
import {
  createGamePresentation,
  type GameSelection,
  type GameStatusLine,
} from '../../game';
import { formatAskPrice } from './formatAskPrice';
import { formatMultiplier } from './formatMultiplier';
import { getAskPricePercent } from './getAskPricePercent';
import { parsePredictDecimal } from './parsePredictDecimal';

export type { GameSelection };

export interface GameCardQuote {
  market: PredictMarket;
  outcome: PredictOutcome;
}

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

const findQuote = (
  event: PredictEvent,
  selection: GameSelection,
): GameCardQuote | undefined => {
  const matches = event.markets.flatMap((market) =>
    market.outcomes
      .filter((outcome) => outcome.gameSelection === selection)
      .map((outcome) => ({ market, outcome })),
  );

  return matches.length === 1 ? matches[0] : undefined;
};

const createTeamProjection = (
  event: PredictEvent,
  selection: GameSelection,
  abbreviation: string,
  team: PredictTeam,
): GameCardTeamProjection => {
  const quote = findQuote(event, selection);
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
