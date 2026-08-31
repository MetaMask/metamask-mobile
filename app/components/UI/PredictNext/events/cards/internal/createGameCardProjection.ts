import BigNumber from 'bignumber.js';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import type {
  PredictEvent,
  PredictGame,
  PredictGameStatus,
  PredictMarket,
  PredictOutcome,
  PredictTeam,
} from '../../../types';
import { formatAskPrice } from './formatAskPrice';
import { formatMultiplier } from './formatMultiplier';
import { getAskPricePercent } from './getAskPricePercent';
import { parsePredictDecimal } from './parsePredictDecimal';

export type GameSelection = 'away' | 'home';

export interface GameCardQuote {
  market: PredictMarket;
  outcome: PredictOutcome;
}

interface GameCardStatusLine {
  label: string;
  metadata: string;
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
  status: Record<'compact' | 'featured', GameCardStatusLine>;
  hiddenMarketCount: number;
  awayProbabilityPercent?: number;
}

const STATUS_KEYS: Record<PredictGameStatus, string> = {
  scheduled: 'scheduled',
  in_progress: 'live',
  delayed: 'delayed',
  suspended: 'suspended',
  postponed: 'postponed',
  completed: 'final',
  canceled: 'canceled',
};

const getStatusLabel = (status: PredictGameStatus) =>
  strings(`predict.game_status.${STATUS_KEYS[status]}`);

const getStatusLine = (
  game: PredictGame,
  startsAt: string | undefined,
  variant: 'compact' | 'featured',
): GameCardStatusLine => {
  if (game.status === 'scheduled') {
    if (!startsAt) {
      return { label: getStatusLabel(game.status), metadata: '' };
    }

    const date = new Date(startsAt);
    if (variant === 'featured') {
      return {
        label: getIntlDateTimeFormatter(I18n.locale, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(date),
        metadata: getIntlDateTimeFormatter(I18n.locale, {
          hour: 'numeric',
          minute: '2-digit',
        }).format(date),
      };
    }

    const day = getIntlDateTimeFormatter(I18n.locale, {
      month: 'long',
      day: 'numeric',
    }).format(date);
    const time = getIntlDateTimeFormatter(I18n.locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
    return { label: `${day} · ${time}`, metadata: '' };
  }

  const metadata = ['in_progress', 'delayed', 'suspended'].includes(game.status)
    ? [game.period, game.clock].filter(Boolean).join(' · ')
    : '';

  return { label: getStatusLabel(game.status), metadata };
};

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
  game: PredictGame,
  selection: GameSelection,
): GameCardTeamProjection => {
  const team = selection === 'away' ? game.awayTeam : game.homeTeam;
  const quote = findQuote(event, selection);
  const formattedPrice = formatAskPrice(quote?.outcome.askPrice);

  return {
    team,
    quote,
    abbreviation: (team.abbreviation ?? team.name.slice(0, 3)).toUpperCase(),
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
  const teams = {
    away: createTeamProjection(event, game, 'away'),
    home: createTeamProjection(event, game, 'home'),
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
      compact: getStatusLine(game, event.startsAt, 'compact'),
      featured: getStatusLine(game, event.startsAt, 'featured'),
    },
    hiddenMarketCount: event.markets.filter(
      (market) => !representedMarkets.has(market.id),
    ).length,
    awayProbabilityPercent,
  };
};
