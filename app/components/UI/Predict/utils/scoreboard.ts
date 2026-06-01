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

export interface SportLiveStatusInput {
  league: PredictSportsLeague;
  status: PredictGameStatus;
  period: PredictGamePeriod | null;
  elapsed: string | null;
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
}: SportLiveStatusInput): string => {
  // Terminal state always reads as "Final".
  if (status === 'ended' || period === 'FT' || period === 'VFT') {
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
