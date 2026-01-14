import { generateDeterministicRandomNumber } from '@metamask/remote-feature-flag-controller';
import { analytics } from '../../../util/analytics/analytics';
import { EXPECTED_ERRORS_PORTION_TO_TRACK } from './constants';

/**
 * The purpose of this function is to decide whether or not to send an *expected* error
 * to our analytics service. It takes the analytics ID and generates a deterministic
 * number between 0 and 1. If the number is less than the EXPECTED_ERRORS_PORTION_TO_TRACK,
 * the error will be sent to the analytics service.
 *
 * @returns A boolean indicating whether or not to send the error to the analytics service
 */
export const shouldTrackExpectedErrors = async (): Promise<boolean> => {
  const analyticsId = await analytics.getAnalyticsId();
  const deterministicRandomNumber = generateDeterministicRandomNumber(
    analyticsId || '',
  );
  return deterministicRandomNumber < EXPECTED_ERRORS_PORTION_TO_TRACK;
};
