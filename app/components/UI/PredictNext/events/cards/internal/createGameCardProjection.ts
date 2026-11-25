import BigNumber from 'bignumber.js';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictEvent, PredictGame, PredictTeam } from '../../../types';
import {
  createGamePresentation,
  findGameTradingQuote,
  formatGameStartShort,
  getGameTeamOrder,
  type GameSelection,
  type GameSelectionQuote,
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
  label: string;
  formattedPrice?: string;
  multiplier?: string;
  percent?: number;
  percentLabel?: string;
  canOrder: boolean;
}

export interface GameCardDrawProjection {
  quote: GameCardQuote;
  formattedPrice?: string;
  percent?: number;
  percentLabel?: string;
  canOrder: boolean;
}

export interface GameCardStatusLine {
  isLive: boolean;
  liveText?: string;
  statusText?: string;
  competition?: string;
}

export interface GameCardProjection {
  teams: Record<GameSelection, GameCardTeamProjection>;
  draw?: GameCardDrawProjection;
  status: GameCardStatusLine;
  showScore: boolean;
  hiddenMarketCount: number;
  /** The order the card lists Teams in, from the Game. */
  teamOrder: GameTeamOrder;
  /** The first Team's share of the two Team prices, as a percent. */
  firstTeamProbabilityPercent?: number;
}

const CARD_STATUS_KEYS: Partial<Record<PredictGame['status'], string>> = {
  completed: 'final',
  delayed: 'delayed',
  suspended: 'suspended',
  postponed: 'postponed',
  canceled: 'canceled',
};

const formatPercentLabel = (percent?: number): string | undefined =>
  percent !== undefined ? `${Math.round(percent)}%` : undefined;

export const formatGameTeamLabel = (
  team: PredictTeam,
  abbreviation: string,
): string => {
  const words = team.name.trim().split(/\s+/).filter(Boolean);
  const shortName = words[words.length - 1];

  if (!shortName) {
    return abbreviation;
  }

  const normalizedShort = shortName.toUpperCase();
  const normalizedAbbr = abbreviation.toUpperCase();

  if (words.length === 1) {
    if (
      !team.abbreviation?.trim() ||
      normalizedShort.startsWith(normalizedAbbr) ||
      normalizedAbbr.startsWith(normalizedShort)
    ) {
      return shortName;
    }
    return `${abbreviation} ${shortName}`;
  }

  if (normalizedShort === normalizedAbbr) {
    return abbreviation;
  }

  return `${abbreviation} ${shortName}`;
};

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
  const percent = getAskPricePercent(quote?.outcome.askPrice);

  return {
    team,
    quote,
    abbreviation,
    label: formatGameTeamLabel(team, abbreviation),
    formattedPrice,
    multiplier: formatMultiplier(quote?.outcome.askPrice),
    percent,
    percentLabel: formatPercentLabel(percent),
    canOrder: Boolean(formattedPrice && quote?.market.status === 'active'),
  };
};

const createDrawProjection = (
  event: PredictEvent,
): GameCardDrawProjection | undefined => {
  const quote = findGameTradingQuote(event, 'draw');
  if (!quote) {
    return undefined;
  }

  const formattedPrice = formatAskPrice(quote.outcome.askPrice);
  const percent = getAskPricePercent(quote.outcome.askPrice);

  return {
    quote,
    formattedPrice,
    percent,
    percentLabel: formatPercentLabel(percent),
    canOrder: Boolean(formattedPrice && quote.market.status === 'active'),
  };
};

const isValidDateString = (value?: string): value is string =>
  Boolean(value && !Number.isNaN(new Date(value).getTime()));

const createCardStatus = (
  event: PredictEvent,
  game: PredictGame,
): GameCardStatusLine => {
  const trimmedCompetition = event.sports?.competition?.label?.trim();
  const competition =
    trimmedCompetition && trimmedCompetition.length > 0
      ? trimmedCompetition
      : undefined;

  if (game.status === 'in_progress') {
    const liveText =
      [game.period, game.clock]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' ') || undefined;
    return { isLive: true, liveText, competition };
  }

  if (game.status === 'scheduled') {
    const statusText = isValidDateString(event.startsAt)
      ? formatGameStartShort(event.startsAt)
      : strings('predict_next.event.game_status.scheduled');
    return { isLive: false, statusText, competition };
  }

  const statusKey = CARD_STATUS_KEYS[game.status];
  if (statusKey) {
    return {
      isLive: false,
      statusText: strings(`predict_next.event.game_status.${statusKey}`),
      competition,
    };
  }

  return {
    isLive: false,
    statusText: competition
      ? undefined
      : strings('predict_next.event.game_status.scheduled'),
    competition,
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
  const draw = createDrawProjection(event);
  const representedMarkets = new Set(
    [...Object.values(teams), ...(draw ? [draw] : [])]
      .filter((entry) => entry.formattedPrice)
      .map((entry) => entry.quote?.market.id),
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
    draw,
    status: createCardStatus(event, game),
    showScore: game.status === 'in_progress' || game.status === 'completed',
    hiddenMarketCount: event.markets.filter(
      (market) => !representedMarkets.has(market.id),
    ).length,
    teamOrder,
    firstTeamProbabilityPercent,
  };
};
