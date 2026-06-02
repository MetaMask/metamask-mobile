import { strings } from '../../../../../locales/i18n';
import { isSoccerLeague } from '../constants/sports';
import type {
  PredictGamePeriod,
  PredictGameStatus,
  PredictSportsLeague,
} from '../types';

/** Soccer convention: minutes are suffixed with an apostrophe, e.g. "75’". */
export const SPORT_ELAPSED_SUFFIX = '’';

/**
 * Periods where the game clock is paused (a break between play) or the game has
 * reached a terminal state. During these we surface the period label instead of
 * a running clock.
 */
const BREAKING_PERIODS: ReadonlySet<PredictGamePeriod> = new Set([
  'End Q1',
  'End Q3',
  'End Q4',
  'HT',
  'FT',
  'VFT',
  'PK',
]);

/**
 * Whether the given period is a non-running (breaking/terminal) period such as
 * halftime, end of a quarter, or full time.
 */
export const isBreakingPeriod = (
  period: PredictGamePeriod | null | undefined,
): boolean => (period ? BREAKING_PERIODS.has(period) : false);

/**
 * Human-friendly label for a period. Known breaking periods map to localized
 * strings (Halftime, Final); everything else falls back to the raw period code.
 */
export const getSportPeriodLabel = (
  period: PredictGamePeriod | null | undefined,
): string => {
  switch (period) {
    case 'HT':
      return strings('predict.sports.halftime');
    case 'FT':
    case 'VFT':
      return strings('predict.sports.final');
    default:
      return period ?? '';
  }
};

export interface GameOverInput {
  status?: PredictGameStatus | null;
  period?: PredictGamePeriod | null;
  /** ISO timestamp stamped by the provider once the game has ended. */
  endTime?: string | null;
}

/**
 * Single source of truth for whether a game has reached a terminal state. A game
 * is over once the provider reports any of:
 * - a terminal `status: 'ended'`,
 * - a full-time period ('FT'/'VFT'), or
 * - a stamped `endTime`.
 *
 * Centralizing this keeps every "game over" consumer in agreement: market
 * visibility (staleness filtering), the scoreboard's "Final" rendering, the live
 * UI, and the card's buy-button gating. Providers don't flip all of these
 * signals atomically (e.g. an `endTime` can be stamped while `status` is still
 * `'ongoing'`), so checking any of them prevents the UI and visibility from
 * disagreeing.
 */
export const isGameEnded = ({
  status,
  period,
  endTime,
}: GameOverInput): boolean =>
  status === 'ended' || period === 'FT' || period === 'VFT' || Boolean(endTime);

export interface SportLiveStatusInput {
  league: PredictSportsLeague;
  status: PredictGameStatus;
  period: PredictGamePeriod | null;
  elapsed: string | null;
  /** ISO timestamp stamped once the game has ended; forces a "Final" label. */
  endTime?: string | null;
}

/**
 * Resolves the status text shown in the scoreboard center for a live game.
 *
 * Format 1 `{period}`: at a breaking or terminal period (e.g. "Halftime", "Final").
 * Format 2 `{elapsed}’`: soccer only, during a running period (e.g. "75’").
 * Format 3 `{period} • {elapsed}`: other sports during running play (e.g. "Q1 • 8:15").
 *
 * Soccer games at a breaking period fall back to format 1 (the period label).
 */
export const getSportLiveStatusText = ({
  league,
  status,
  period,
  elapsed,
  endTime,
}: SportLiveStatusInput): string => {
  // Terminal state always reads as "Final".
  if (isGameEnded({ status, period, endTime })) {
    return strings('predict.sports.final');
  }

  // Breaking period (clock paused) -> show the period label.
  if (isBreakingPeriod(period)) {
    return getSportPeriodLabel(period);
  }

  // Soccer during running play -> minute with apostrophe, e.g. "75’".
  if (isSoccerLeague(league) && elapsed) {
    return `${elapsed}${SPORT_ELAPSED_SUFFIX}`;
  }

  // Other sports during running play -> "{period} • {elapsed}".
  if (period && elapsed) {
    return `${period} • ${elapsed}`;
  }

  return period ?? elapsed ?? '';
};
