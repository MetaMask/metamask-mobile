import type { MutableRefObject } from 'react';
import { NavigationState, PartialState } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import type { MMPayOnRampIntent } from '../../../UI/Ramp/types';
import { bindMMPayOnRampOrder } from '../hooks/pay/useMMPayOnRampLifecycle';

const MMPAY_RAMP_CONTAINER_ROUTES = new Set<string>([
  Routes.RAMP.TOKEN_SELECTION,
  Routes.RAMP.BUY,
  Routes.DEPOSIT.ID,
]);

/**
 * Resolves MM-pay order-processing interception for ramp callbacks by binding
 * the processed order id to the active MM-pay top-up session.
 */
export function resolveMMPayOnRampOrderProcessingIntercept({
  mmPayOnRamp,
  processedOrderId,
}: ResolveMMPayOnRampOrderProcessingInterceptParams): ResolveMMPayOnRampOrderProcessingInterceptResult {
  if (!mmPayOnRamp) {
    return { shouldSkip: false };
  }

  bindMMPayOnRampOrder(mmPayOnRamp.mmPayTransactionId, processedOrderId);

  return {
    shouldSkip: false,
    mmPayOnRamp,
  };
}

/**
 * Returns the user to the underlying confirmation by popping exactly one
 * ramp container route when possible.
 */
export function returnToMMPayConfirmation(
  navigation: ReturnToMMPayConfirmationNavigation,
): boolean {
  const parentNavigation = navigation.dangerouslyGetParent?.();
  const containerNavigation = parentNavigation?.dangerouslyGetParent?.();

  if (!containerNavigation) {
    return false;
  }

  const containerState = containerNavigation.dangerouslyGetState?.();
  const activeRouteName = getActiveRouteNameAtLevel(containerState);
  const canGoBack = containerNavigation.canGoBack();

  if (activeRouteName) {
    if (!MMPAY_RAMP_CONTAINER_ROUTES.has(activeRouteName)) {
      return false;
    }

    if (!canGoBack) {
      return false;
    }

    containerNavigation.goBack();
    return true;
  }

  if (!canGoBack) {
    return false;
  }

  containerNavigation.goBack();
  return true;
}

interface ResolveMMPayOnRampOrderProcessingInterceptParams {
  mmPayOnRamp?: MMPayOnRampIntent;
  processedOrderId: string;
  // Kept for callsite compatibility while interception dedupe is simplified.
  lastHandledInterceptKeyRef?: MutableRefObject<string | null>;
}

interface ResolveMMPayOnRampOrderProcessingInterceptResult {
  shouldSkip: boolean;
  mmPayOnRamp?: MMPayOnRampIntent;
}

interface ReturnToMMPayConfirmationNavigation {
  dangerouslyGetParent?: () =>
    | {
        dangerouslyGetParent?: () =>
          | {
              dangerouslyGetState?: () =>
                | NavigationState
                | PartialState<NavigationState>
                | undefined;
              canGoBack: () => boolean;
              goBack: () => void;
            }
          | undefined;
      }
    | undefined;
}

function getActiveRouteNameAtLevel(
  state?: NavigationState | PartialState<NavigationState>,
): string | undefined {
  if (!state || state.routes.length === 0) {
    return undefined;
  }

  const index = state.index ?? state.routes.length - 1;
  return state.routes[index]?.name;
}
