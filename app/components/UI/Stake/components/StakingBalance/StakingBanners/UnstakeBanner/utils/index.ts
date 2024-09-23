import { strings } from '../../../../../../../../../locales/i18n';

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
