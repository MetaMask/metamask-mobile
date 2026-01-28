import { selectGasFeeControllerEstimates } from './gasFeeController';

/**
 * Returns gas fee estimates from the GasFeeController.
 *
 * Note: This selector previously merged transaction-specific gas fee estimates
 * with controller estimates. Since the legacy transaction Redux state was removed,
 * it now directly returns the GasFeeController estimates.
 */
export const selectGasFeeEstimates = selectGasFeeControllerEstimates;
