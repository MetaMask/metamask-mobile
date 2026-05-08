import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import type { BuyFlowOrigin } from '../Views/BuildQuote/BuildQuote';
import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import {
  resolveRampControllerAssetId,
  type TokenForResolve,
} from './resolveRampControllerAssetId';

/**
 * How {@link navigateToRampBuy} should route when unified routing is overridden
 * or legacy V1 is off (`mode` applies after eligibility checks and V2 branches).
 */
export enum NavigateToRampBuyMode {
  AGGREGATOR = 'AGGREGATOR',
  DEPOSIT = 'DEPOSIT',
}

export interface NavigateToRampBuyOptions {
  mode?: NavigateToRampBuyMode;
  overrideUnifiedRouting?: boolean;
  buyFlowOrigin?: BuyFlowOrigin;
}

/**
 * React Navigation handle used by ramp buy routing. Pass `useNavigation()` from
 * a screen inside a navigator that hosts RAMP / DEPOSIT routes, or an equivalent
 * object (e.g. `NavigationService.navigation` where typed compatibly).
 */
export type NavigateToRampBuyNavigation = Pick<
  NavigationProp<ParamListBase>,
  'navigate'
>;

/**
 * Redux- and controller-derived inputs for buy routing. In React screens, wire
 * these from hooks/selectors (`useRampsUnifiedV1Enabled`, `getRampRoutingDecision`, etc.).
 */
export interface NavigateToRampBuyDeps {
  isRampsUnifiedV1Enabled: boolean;
  isRampsUnifiedV2Enabled: boolean;
  rampRoutingDecision: UnifiedRampRoutingType | null;
  rampsTokensAll: TokenForResolve[];
  setSelectedToken: (assetId: string) => void;
}

/**
 * Imperatively starts the **buy** ramp experience with the same routing rules as
 * {@link useRampNavigation}'s `goToBuy` (eligibility modals, Unified Buy 2 / BuildQuote,
 * token selection, V1 deposit vs aggregator, override modes).
 *
 * Prefer `useRampNavigation` inside React components; use `navigateToRampBuy` when you
 * have `navigation` and {@link NavigateToRampBuyDeps} outside that hook (e.g. tests).
 *
 * When `isRampsUnifiedV2Enabled` is true and `overrideUnifiedRouting` is false, an
 * `intent.assetId` routes to BuildQuote (after resolving against `rampsTokensAll`);
 * missing `assetId` routes to token selection. UB2 takes precedence over V1 when both
 * apply and `assetId` is present.
 *
 * @param navigation - Navigation object with `navigate` (e.g. from `useNavigation()`).
 * @param intent - Optional ramp intent (e.g. `assetId` for pre-selected token).
 * @param options - `buyFlowOrigin` for BuildQuote, `overrideUnifiedRouting` to force legacy paths.
 * @param deps - Feature flags, routing decision, token list, and `setSelectedToken`.
 */
export function navigateToRampBuy(
  navigation: NavigateToRampBuyNavigation,
  intent: RampIntent | undefined,
  options: NavigateToRampBuyOptions | undefined,
  deps: NavigateToRampBuyDeps,
): void {
  const {
    mode = NavigateToRampBuyMode.AGGREGATOR,
    overrideUnifiedRouting = false,
  } = options ?? {};

  const {
    isRampsUnifiedV1Enabled,
    isRampsUnifiedV2Enabled,
    rampRoutingDecision,
    rampsTokensAll,
    setSelectedToken,
  } = deps;

  const isUnifiedRoutingEnabled =
    (isRampsUnifiedV1Enabled || isRampsUnifiedV2Enabled) &&
    !overrideUnifiedRouting;

  if (isUnifiedRoutingEnabled) {
    if (rampRoutingDecision === UnifiedRampRoutingType.ERROR) {
      navigation.navigate(...createEligibilityFailedModalNavigationDetails());
      return;
    }

    if (rampRoutingDecision === UnifiedRampRoutingType.UNSUPPORTED) {
      navigation.navigate(...createRampUnsupportedModalNavigationDetails());
      return;
    }
  }

  if (isRampsUnifiedV2Enabled && intent?.assetId && !overrideUnifiedRouting) {
    const controllerAssetId = resolveRampControllerAssetId(
      intent.assetId,
      rampsTokensAll,
    );
    try {
      setSelectedToken(controllerAssetId);
    } catch {
      // Token may not be in controller's list yet (still loading).
      // Navigate anyway — BuildQuote will handle the missing token.
    }
    navigation.navigate(
      ...createBuildQuoteNavDetails({
        assetId: controllerAssetId,
        buyFlowOrigin: options?.buyFlowOrigin,
      }),
    );
    return;
  }

  if (isRampsUnifiedV2Enabled && !intent?.assetId && !overrideUnifiedRouting) {
    navigation.navigate(...createTokenSelectionNavDetails());
    return;
  }

  if (isRampsUnifiedV1Enabled && !overrideUnifiedRouting) {
    if (!intent?.assetId) {
      navigation.navigate(...createTokenSelectionNavDetails());
      return;
    }

    if (rampRoutingDecision === null) {
      navigation.navigate(...createTokenSelectionNavDetails());
      return;
    }

    if (rampRoutingDecision === UnifiedRampRoutingType.DEPOSIT) {
      navigation.navigate(...createDepositNavigationDetails(intent));
    } else if (rampRoutingDecision === UnifiedRampRoutingType.AGGREGATOR) {
      navigation.navigate(
        ...createRampNavigationDetails(AggregatorRampType.BUY, intent),
      );
    }
    return;
  }

  if (mode === NavigateToRampBuyMode.DEPOSIT) {
    navigation.navigate(...createDepositNavigationDetails(intent));
  } else {
    navigation.navigate(
      ...createRampNavigationDetails(AggregatorRampType.BUY, intent),
    );
  }
}
