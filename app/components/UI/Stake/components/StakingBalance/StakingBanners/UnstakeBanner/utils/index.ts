import { DAY, HOUR } from '../../../../../../../../constants/time';
import { strings } from '../../../../../../../../../locales/i18n';
import { UnstakingBannerProps } from '../UnstakeBanner.types';

/**
 * Returns an object containing the difference in days and/or hours between two unstaking request timestamps.
 *
 * This is used to dynamically render the days/hours countdown.
 *
 * @param {number} timestamp1
 * @param {number} timestamp2
 *
 * @returns object with difference in amount of days and hours.
 */
export const getUnstakingTimeDifference = (
  timestamp1: number,
  timestamp2: number,
) => {
  const difference = {
    days: 0,
    hours: 0,
  };

  if (!timestamp1 || !timestamp2) {
    difference.days = 11;
    return difference;
  }

  const timeDifference = timestamp2 - timestamp1;

  const days = Math.floor(timeDifference / DAY);
  const hours = Math.ceil((timeDifference - days * DAY) / HOUR);

  difference.days = days;
  difference.hours = hours;

  return difference;
};

export const renderUnstakingTimeRemaining = (
  { days, hours }: UnstakingBannerProps['timeRemaining'],
  amountEth: UnstakingBannerProps['amountEth'],
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
