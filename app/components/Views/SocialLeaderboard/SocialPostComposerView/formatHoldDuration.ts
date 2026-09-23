import { DAY, HOUR, MINUTE } from '../../../../constants/time';
import { tradeTimestampToMs } from '../utils/tradeTimestamp';

/**
 * Compact hold-time label matching the composer/feed prototype (`2d 2h`, `21h`).
 */
export const formatHoldDuration = (durationMs: number): string => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '1m';
  }

  const days = Math.floor(durationMs / DAY);
  const hours = Math.floor((durationMs % DAY) / HOUR);
  const minutes = Math.floor((durationMs % HOUR) / MINUTE);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
};

export const holdDurationFromTimestamps = (
  startTimestamp: number,
  endTimestamp: number,
): string => {
  const startMs = tradeTimestampToMs(startTimestamp);
  const endMs = tradeTimestampToMs(endTimestamp);
  return formatHoldDuration(endMs - startMs);
};
