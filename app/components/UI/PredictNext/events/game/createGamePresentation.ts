import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import type {
  PredictEvent,
  PredictGame,
  PredictGameStatus,
  PredictTeam,
} from '../../types';

export type GameSelection = 'away' | 'home';

export type GameTeamOrder = readonly [GameSelection, GameSelection];

const AWAY_FIRST: GameTeamOrder = ['away', 'home'];
const HOME_FIRST: GameTeamOrder = ['home', 'away'];

/**
 * The order Teams appear in across a Game's UI: header, cards, footer and
 * line pickers. The API sends it per Game; when absent the away Team comes
 * first.
 */
export const getGameTeamOrder = (game?: PredictGame): GameTeamOrder =>
  game?.teamOrder === 'home_first' ? HOME_FIRST : AWAY_FIRST;

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

/**
 * A Team's short label: its abbreviation, else its first three letters. A
 * blank abbreviation counts as missing, so the label is never empty.
 */
export const getTeamAbbreviation = (team: PredictTeam): string =>
  (team.abbreviation?.trim() || team.name.slice(0, 3)).toUpperCase();

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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days a weekday name stays unambiguous on either side of today. */
const WEEKDAY_WINDOW_DAYS = 7;

const startOfLocalDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * A Game's start for small cards, in the app locale and the device time
 * zone: "Mon · 8:15 PM" within a week of today, else "Nov 23 · 1:00 PM".
 */
export const formatGameStartShort = (
  startsAt: string,
  now: Date = new Date(),
): string => {
  // Rounding absorbs the 23 or 25 hour days around a daylight saving change.
  const days = Math.round(
    (startOfLocalDay(new Date(startsAt)) - startOfLocalDay(now)) / DAY_MS,
  );
  const dateOptions: Intl.DateTimeFormatOptions =
    Math.abs(days) < WEEKDAY_WINDOW_DAYS
      ? { weekday: 'short' }
      : { month: 'short', day: 'numeric' };
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
