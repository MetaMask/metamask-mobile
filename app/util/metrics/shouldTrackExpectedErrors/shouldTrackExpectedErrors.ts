import { generateDeterministicRandomNumber } from '@metamask/remote-feature-flag-controller';
import { EXPECTED_ERRORS_PORTION_TO_TRACK } from './constants';
import { getAnalyticsId } from '../getAnalyticsId';

/**
 * Decides whether or not to track an *expected* error
 * with our analytics service.
 * It takes the analytics ID and generates a deterministic
 * number between 0 and 1. If the number is less than the EXPECTED_ERRORS_PORTION_TO_TRACK,
 * the error will be sent to the analytics service.
 *
 * @returns A boolean indicating whether or not to send the error to the analytics service
 */
export const shouldTrackExpectedErrors = async (): Promise<boolean> => {
  try {
    const analyticsId = await getAnalyticsId();

    // If analyticsId is empty string, don't track the error
    // generateDeterministicRandomNumber throws an error when given an empty string
    if (!analyticsId || analyticsId.length === 0) {
      return false;
    }

    const deterministicRandomNumber =
      generateDeterministicRandomNumber(analyticsId);
    return deterministicRandomNumber < EXPECTED_ERRORS_PORTION_TO_TRACK;
  } catch (error) {
    // If there's any error getting analytics ID, don't track
    return false;
  }
};
