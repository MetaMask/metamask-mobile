import type { RootState } from '../../../../reducers';
import { selectPredictEnabledFlag } from '../../Predict/selectors/featureFlags';

/**
 * Whether Predict entry points show. Today it is the legacy lane's rule,
 * `predictTradingEnabled` (`selectPredictEnabledFlag`), unchanged. PRED-1377
 * makes it follow the Active Venue without changing callers.
 *
 * Availability only: eligibility, Account Readiness, rollout and kill
 * switches stay separate projections. Do not fold them in here.
 */
export const selectPredictAvailability = (state: RootState): boolean =>
  selectPredictEnabledFlag(state);
