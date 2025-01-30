import { DateTime } from 'luxon';

/**
 * @param {number} unixTimestamp - timestamp as seconds since unix epoch
 * @returns {string} formatted date string e.g. "14 July 2034, 22:22"
 */
export const formatUTCDateFromUnixTimestamp = (unixTimestamp: number) => {
  if (!unixTimestamp) {
    return unixTimestamp;
  }

  return DateTime.fromSeconds(unixTimestamp)
    .toUTC()
    .toFormat('dd LLLL yyyy, HH:mm');
};

/**
 * Date values may include -1 to represent a null value
 * e.g.
 * {@see {@link https://eips.ethereum.org/EIPS/eip-2612}}
 * "The deadline argument can be set to uint(-1) to create Permits that effectively never expire."
 */
export const NONE_DATE_VALUE = -1;
