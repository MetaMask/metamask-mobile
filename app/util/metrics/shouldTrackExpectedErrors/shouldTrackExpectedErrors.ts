import { generateDeterministicRandomNumber } from '@metamask/remote-feature-flag-controller';
import { IMetaMetrics } from '../../../core/Analytics/MetaMetrics.types';
import { EXPECTED_ERRORS_PORTION_TO_TRACK } from './constants';

/**
 * The purpose of this function is to decide whether or not to send an *expected* error
 * to our analytics service. It takes the MetaMetrics ID and generates a deterministic
 * number between 0 and 1. If the number is less than the EXPECTED_ERRORS_PORTION_TO_TRACK,
 * the error will be sent to the analytics service.
*
* @param MetaMetricsInstance - The MetaMetrics instance to use
* @returns A boolean indicating whether or not to send the error to the analytics service
*/
export const shouldTrackExpectedErrors = async (
  MetaMetricsInstance: IMetaMetrics,
): Promise<boolean> => {
  const metaMetricsId = await MetaMetricsInstance.getMetaMetricsId();
  const deterministicRandomNumber = generateDeterministicRandomNumber(metaMetricsId || '');
  return deterministicRandomNumber < EXPECTED_ERRORS_PORTION_TO_TRACK;
};

