import Routes from '../../../../../constants/navigation/Routes';
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
 * entity of a Venue that is not the Active Venue. `notFound`: a link names
 * nothing this build can open (an unknown Venue or Feed Screen).
 */
export type PredictIntentUnavailableReason =
  | 'resolving'
  | 'unsupported'
  | 'venueMismatch'
  | 'notFound';

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

/** A navigation on the app navigator: `navigate(routeName, params)`. */
export interface PredictAppNavigation {
  routeName: string;
  params: object;
}

/**
 * The app-navigator call a target makes. The legacy market details target
 * is the call `usePredictNavigation` makes `throughRoot`.
 */
export const toAppNavigation = (
  target: PredictIntentTarget,
): PredictAppNavigation => {
  switch (target.kind) {
    case 'predict':
      return { routeName: Routes.PREDICT.ROOT, params: target.params };
    case 'predictModals':
      return { routeName: Routes.PREDICT.MODALS.ROOT, params: target.params };
    case 'legacyMarketDetails':
      return {
        routeName: Routes.PREDICT.ROOT,
        params: {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: target.params,
        },
      };
  }
};
