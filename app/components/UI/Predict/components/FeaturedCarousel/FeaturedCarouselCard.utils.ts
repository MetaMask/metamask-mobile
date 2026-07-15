import I18n from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import {
  PredictGameStatus,
  PredictMarketGame,
  PredictOutcome,
  PredictSportsLeague,
} from '../../types';

export const BET_AMOUNT = 100;

export const LEAGUE_DISPLAY_NAMES: Record<string, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  ucl: 'UCL',
};

const LEAGUE_TOTAL_MINUTES: Partial<Record<PredictSportsLeague, number>> = {
  nba: 48,
  nfl: 60,
  ucl: 90,
};

export const getTimeRemaining = (
  game: PredictMarketGame,
  elapsed?: string | null,
  status?: PredictGameStatus,
): string | null => {
  const currentStatus = status ?? game.status;
  const elapsedStr = elapsed ?? game.elapsed;
  if (!elapsedStr || currentStatus !== 'ongoing') return null;

  let elapsedMins: number;
  if (elapsedStr.includes(':')) {
    const [mm, ss] = elapsedStr.split(':').map(Number);
    elapsedMins = (mm || 0) + ((ss || 0) >= 30 ? 1 : 0);
  } else {
    elapsedMins = parseInt(elapsedStr.replace(/[^0-9]/g, ''), 10);
  }

  if (isNaN(elapsedMins)) return null;
  const totalMins = LEAGUE_TOTAL_MINUTES[game.league] ?? 90;
  const remaining = Math.max(0, totalMins - elapsedMins);
  return `${remaining} mins`;
};

export const formatScheduledTime = (startTime: string): string => {
  const dateObj = new Date(startTime);
  const formatter = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return formatter.format(dateObj);
};

export const getPayoutDisplay = (price: number): string => {
  if (price <= 0 || price >= 1) {
    return `$${BET_AMOUNT.toFixed(2)}`;
  }

  return `$${(BET_AMOUNT / price).toFixed(2)}`;
};

export const calculateTotalVolume = (outcomes: PredictOutcome[]): number =>
  outcomes.reduce((sum, outcome) => {
    const volume =
      typeof outcome.volume === 'string'
        ? parseFloat(outcome.volume) || 0
        : outcome.volume || 0;
    return sum + volume;
  }, 0);
