import { usePredictEligibility } from '../../Predict/hooks/usePredictEligibility';

/**
 * Whether the user's region may use the legacy Polymarket deposit:
 * Polymarket's geo eligibility, refreshed the way legacy Predict refreshes
 * it. Pair it with `usePredictLegacyDeposit`, which decides whether the
 * deposit applies to the Active Venue at all.
 */
export const usePredictLegacyDepositEligibility = (): boolean =>
  usePredictEligibility().isEligible;
