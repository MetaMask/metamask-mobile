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
  { days, hours }: { days: number; hours: number },
  amountEth: string,
) => {
  if (!days && !hours)
    return strings('stake.banner_text.unstaking_in_progress.default', {
      amountEth,
    });

  let copy = strings('stake.banner_text.unstaking_in_progress.base', {
    amountEth,
  });

  if (days && hours) {
    copy = `${copy} ${days} ${strings('stake.day', { count: days })} ${strings(
      'stake.banner_text.unstaking_in_progress.and',
    )} ${hours} ${strings('stake.hour', { count: hours })} ${strings(
      'stake.banner_text.unstaking_in_progress.to_claim_it',
    )}`;
  }

  if (days && !hours) {
    copy = `${copy} ${days} ${strings('stake.day', { count: days })} ${strings(
      'stake.banner_text.unstaking_in_progress.to_claim_it',
    )}`;
  }

  if (hours && !days) {
    copy = `${copy} ${hours} ${strings('stake.hour', {
      count: hours,
    })} ${strings('stake.banner_text.unstaking_in_progress.to_claim_it')}`;
  }

  return copy;
};
