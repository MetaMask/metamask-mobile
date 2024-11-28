import { strings } from '../../../../../../../../../locales/i18n';

/**
 * Allows for flexible rendering of unstaking banner countdown.
 *
 * Examples:
 * - Unstaking 0.0172 ETH in progress. Come back later to claim it. (days: 0, hours: 0) (default)
 * - Unstaking 0.0172 ETH in progress. Come back in 1 day to claim it. (days: 1, hours: 0).
 * - Unstaking 0.0172 ETH in progress. Come back in 1 hour to claim it. (days: 0, hours: 1).
 * - Unstaking 0.0172 ETH in progress. Come back in 2 days and 3 hours. (days: 2, hours: 3).
 */
export const renderUnstakingTimeRemaining = (
  { days, hours, minutes }: { days: number; hours: number; minutes: number },
  amountEth: string,
) => {
  if (!days && !hours && !minutes)
    return strings('stake.banner_text.unstaking_in_progress.default', {
      amountEth,
    });

  const baseCopy = strings('stake.banner_text.unstaking_in_progress.base', {
    amountEth,
  });

  const minuteString = minutes
    ? `${strings('stake.banner_text.approximately')} ${minutes} ${strings(
        'stake.minute',
        {
          count: minutes,
        },
      )}`
    : '';

  const dayString = days
    ? `${days} ${strings('stake.day', { count: days })}`
    : '';

  const hourString = hours
    ? `${hours} ${strings('stake.hour', { count: hours })}`
    : '';

  const andString =
    days && hours
      ? ` ${strings('stake.banner_text.unstaking_in_progress.and')} `
      : '';

  const toClaimString = strings(
    'stake.banner_text.unstaking_in_progress.to_claim_it',
  );

  if (!days && !hours && minutes) {
    return `${baseCopy} ${minuteString} ${toClaimString}`.trim();
  }

  return `${baseCopy} ${dayString}${andString}${hourString} ${toClaimString}`.trim();
};
