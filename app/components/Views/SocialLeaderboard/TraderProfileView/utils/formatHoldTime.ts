import { Duration } from 'luxon';
import { strings } from '../../../../../../locales/i18n';

export function formatHoldTime(minutes: number): string {
  const duration = Duration.fromObject({ minutes }).shiftTo(
    'days',
    'hours',
    'minutes',
  );

  if (duration.days >= 1) {
    return strings('social_leaderboard.trader_profile.hold_time_days', {
      count: parseFloat(duration.as('days').toFixed(1)),
    });
  }
  if (duration.hours >= 1) {
    return strings('social_leaderboard.trader_profile.hold_time_hours', {
      count: parseFloat(duration.as('hours').toFixed(1)),
    });
  }
  return strings('social_leaderboard.trader_profile.hold_time_minutes', {
    count: Math.round(duration.minutes),
  });
}
