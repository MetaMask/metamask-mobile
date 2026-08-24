import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import type {
  PredictEvent,
  PredictGame,
  PredictGameStatus,
  PredictTeam,
} from '../../types';

export type GameSelection = 'away' | 'home';
export type GamePresentationVariant = 'compact' | 'featured' | 'detail';

export interface GameStatusLine {
  label: string;
  metadata: string;
}

export interface GameTeamPresentation {
  team: PredictTeam;
  abbreviation: string;
}

export interface GamePresentation {
  teams: Record<GameSelection, GameTeamPresentation>;
  status: Record<GamePresentationVariant, GameStatusLine>;
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

const LIVE_METADATA_STATUSES: ReadonlySet<PredictGameStatus> = new Set([
  'in_progress',
  'delayed',
  'suspended',
]);

/** Returns the Event's Game snapshot when one exists. */
export const getEventGame = (event: PredictEvent): PredictGame | undefined =>
  event.sports?.game;

const getStatusLabel = (status: PredictGameStatus) =>
  strings(`predict.game_status.${STATUS_KEYS[status]}`);

const getTeamAbbreviation = (team: PredictTeam): string =>
  (team.abbreviation ?? team.name.slice(0, 3)).toUpperCase();

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

const formatDateTime = (
  startsAt: string,
  dateOptions: Intl.DateTimeFormatOptions,
): { date: string; time: string } => {
  const date = new Date(startsAt);
  return {
    date: getIntlDateTimeFormatter(I18n.locale, dateOptions).format(date),
    time: getIntlDateTimeFormatter(I18n.locale, TIME_OPTIONS).format(date),
  };
};

const formatStart = (
  startsAt: string | undefined,
  dateOptions: Intl.DateTimeFormatOptions,
): string | undefined => {
  if (!startsAt) {
    return undefined;
  }

  const { date, time } = formatDateTime(startsAt, dateOptions);
  return `${date} · ${time}`;
};

const getStatusLine = (
  game: PredictGame,
  startsAt: string | undefined,
  variant: GamePresentationVariant,
): GameStatusLine => {
  if (variant === 'detail') {
    const start =
      game.status === 'scheduled'
        ? formatStart(startsAt, { month: 'short', day: 'numeric' })
        : undefined;
    const metadata = [start, game.period, game.clock]
      .filter(Boolean)
      .join(' · ');
    return { label: getStatusLabel(game.status), metadata };
  }

  if (game.status === 'scheduled') {
    if (!startsAt) {
      return { label: getStatusLabel(game.status), metadata: '' };
    }

    if (variant === 'featured') {
      const { date, time } = formatDateTime(startsAt, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      return { label: date, metadata: time };
    }

    return {
      label: formatStart(startsAt, { month: 'long', day: 'numeric' }) ?? '',
      metadata: '',
    };
  }

  const metadata = LIVE_METADATA_STATUSES.has(game.status)
    ? [game.period, game.clock].filter(Boolean).join(' · ')
    : '';

  return { label: getStatusLabel(game.status), metadata };
};

/** Projects Game Teams and status lines for cards and the Event Screen. */
export const createGamePresentation = (
  event: PredictEvent,
  game: PredictGame,
): GamePresentation => ({
  teams: {
    away: {
      team: game.awayTeam,
      abbreviation: getTeamAbbreviation(game.awayTeam),
    },
    home: {
      team: game.homeTeam,
      abbreviation: getTeamAbbreviation(game.homeTeam),
    },
  },
  status: {
    compact: getStatusLine(game, event.startsAt, 'compact'),
    featured: getStatusLine(game, event.startsAt, 'featured'),
    detail: getStatusLine(game, event.startsAt, 'detail'),
  },
});
