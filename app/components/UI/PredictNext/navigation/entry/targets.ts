import type { NavigatorScreenParams } from '@react-navigation/native';
import type {
  PredictMarketDetailsParams,
  PredictModalsNavigationParamList,
} from '../../../Predict/types/navigation';
import type { PredictRootScreenParamList } from '../appRoutes';

/**
 * A resolved navigation, as data, so resolution is testable without a
 * navigator. Each kind names the call that performs it.
 */
export type PredictIntentTarget =
  /** `navigate('Predict', params)`. */
  | {
      kind: 'predict';
      params: NavigatorScreenParams<PredictRootScreenParamList>;
    }
  /** `navigate('PredictModals', params)`. */
  | {
      kind: 'predictModals';
      params: NavigatorScreenParams<PredictModalsNavigationParamList>;
    }
  /**
   * Legacy `usePredictNavigation().navigateToMarketDetails(params,
   * { throughRoot: true })`.
   */
  | { kind: 'legacyMarketDetails'; params: PredictMarketDetailsParams };

/**
 * Why an intent opens nothing. `resolving`: the Active Venue is not known
 * yet and the intent needs it. `unsupported`: the Active Venue's
 * implementation has no such entry. `venueMismatch`: the intent names an
 * entity of a Venue that is not the Active Venue.
 */
export type PredictIntentUnavailableReason =
  | 'resolving'
  | 'unsupported'
  | 'venueMismatch';

export type PredictIntentResolution =
  | { status: 'ready'; target: PredictIntentTarget }
  | { status: 'unavailable'; reason: PredictIntentUnavailableReason };

export const ready = (
  target: PredictIntentTarget,
): PredictIntentResolution => ({
  status: 'ready',
  target,
});

export const unavailable = (
  reason: PredictIntentUnavailableReason,
): PredictIntentResolution => ({ status: 'unavailable', reason });
