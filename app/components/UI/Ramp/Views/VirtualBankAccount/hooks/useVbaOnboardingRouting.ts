import { useCallback } from 'react';
import {
  CommonActions,
  StackActions,
  useNavigation,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import ReduxService from '../../../../../../core/redux';
import Logger from '../../../../../../util/Logger';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import type { RootState } from '../../../../../../reducers';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  getVbaDestinationForSnapshot,
  type VbaOnboardingDestinationId,
} from '../vbaOnboardingFunnel';
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import type { VbaOnboardingSnapshot } from '../vbaOnboardingSnapshot';
import {
  getVbaVendorTermsAcceptance,
  hasAcceptedVbaVendorTerms,
} from '../vbaVendorTermsStorage';
import { VbaOnboardingRoutes, type VbaOnboardingParamList } from '../routes';
import { applyVbaDevOverrides } from '../vbaDevOverrides';

const MAX_NAVIGATION_PARENTS = 6;

type VbaOnboardingScreenName =
  (typeof VbaOnboardingRoutes)[keyof typeof VbaOnboardingRoutes];

type VbaOnboardingRouteParams = VbaOnboardingParamList[VbaOnboardingScreenName];

interface VbaOnboardingRoute {
  name: VbaOnboardingScreenName;
  params?: VbaOnboardingRouteParams;
}

interface NavigatorStateRoute {
  key?: string;
  name: string;
  params?: object;
  state?: object;
}

interface NavigatorState {
  index: number;
  routeNames?: string[];
  routes: NavigatorStateRoute[];
}

interface StackController {
  navigate: (name: string, params?: object) => void;
  dispatch: (action: ReturnType<typeof CommonActions.reset>) => void;
  getParent?: () => StackController | undefined;
  getState?: () => NavigatorState | undefined;
}

const toStackController = (navigation: AppNavigationProp): StackController =>
  navigation as unknown as StackController;

const toOnboardingRoute = (
  screen: VbaOnboardingScreenName,
  params?: VbaOnboardingRouteParams,
): VbaOnboardingRoute =>
  params === undefined ? { name: screen } : { name: screen, params };

const getDefaultCallerRoute = (): NavigatorStateRoute => ({
  name: Routes.HOME_TABS,
  params: {
    screen: Routes.MONEY.ROOT,
    params: { screen: Routes.MONEY.HOME },
  },
});

const getCallerRoute = (state: NavigatorState): NavigatorStateRoute => {
  const activeRoute = state.routes[state.index];
  if (activeRoute?.name !== Routes.RAMP.VBA_ONBOARDING) {
    return activeRoute ?? getDefaultCallerRoute();
  }

  return state.routes[state.index - 1] ?? getDefaultCallerRoute();
};

/**
 * Keeps exactly two root routes: the screen that opened onboarding and the
 * current onboarding destination. Back then always returns to the caller.
 */
const openAsOnlyOnboardingRoute = (
  navigation: AppNavigationProp,
  screen: VbaOnboardingScreenName,
  params?: VbaOnboardingRouteParams,
): void => {
  const route = toOnboardingRoute(screen, params);
  let current: StackController | undefined = toStackController(navigation);

  for (let depth = 0; depth < MAX_NAVIGATION_PARENTS && current; depth += 1) {
    const state = current.getState?.();
    if (state?.routeNames?.includes(Routes.RAMP.VBA_ONBOARDING)) {
      const routes = [
        getCallerRoute(state),
        {
          name: Routes.RAMP.VBA_ONBOARDING,
          state: { index: 0, routes: [route] },
        },
      ];
      current.dispatch(
        CommonActions.reset({
          index: routes.length - 1,
          routes,
        } as PartialState<NavigationState>),
      );
      return;
    }

    const parent: StackController | undefined = current.getParent?.();
    if (!parent || parent === current) {
      break;
    }
    current = parent;
  }

  // An explicit stack with only the destination keeps vendor terms from
  // sitting underneath, so back leaves the flow.
  navigation.navigate(Routes.RAMP.VBA_ONBOARDING, {
    state: {
      index: 0,
      routes: [route],
    },
  });
};

export const navigateToVbaOnboardingDestination = (
  navigation: AppNavigationProp,
  destinationId: VbaOnboardingDestinationId,
  snapshot?: VbaOnboardingSnapshot,
): void => {
  if (destinationId === 'complete') {
    openAsOnlyOnboardingRoute(navigation, VbaOnboardingRoutes.DETAILS);
    return;
  }
  if (destinationId === 'identityVerification') {
    openAsOnlyOnboardingRoute(
      navigation,
      snapshot
        ? VbaOnboardingRoutes.IDENTITY_VERIFICATION
        : VbaOnboardingRoutes.ERROR,
      snapshot ? { snapshot } : undefined,
    );
    return;
  }

  const screen = {
    vendorTerms: VbaOnboardingRoutes.VENDOR_TERMS,
    email: VbaOnboardingRoutes.EMAIL,
    kycPending: VbaOnboardingRoutes.KYC_PENDING,
    kycRejected: VbaOnboardingRoutes.KYC_REJECTED,
    accountProvisioningError: VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR,
    error: VbaOnboardingRoutes.ERROR,
  }[destinationId];

  openAsOnlyOnboardingRoute(navigation, screen);
};

const openRecoverableError = (navigation: AppNavigationProp): void => {
  navigateToVbaOnboardingDestination(navigation, 'error');
};

export interface OpenVbaOnboardingRequest {
  source?: string;
  /**
   * Re-enter identity verification when hydrate still reports a rejected KYC
   * session. Without this, Try again on the failure page routes back to itself.
   * The retry pushes a new identity screen so SumSub mounts again instead of
   * revealing the previous one.
   */
  retryRejectedKyc?: boolean;
}

const resolveOpenRequest = (
  request: string | OpenVbaOnboardingRequest | undefined,
  defaultSource: string,
): { source: string; retryRejectedKyc: boolean } => {
  if (typeof request === 'string') {
    return { source: request, retryRejectedKyc: false };
  }

  return {
    source: request?.source ?? defaultSource,
    retryRejectedKyc: request?.retryRejectedKyc === true,
  };
};

/**
 * Hydrates VBA onboarding facts and opens the first incomplete module. This is
 * the single coordinator API used for entry, retry, and module completion.
 *
 * @param defaultSource - Caller/entry point for error telemetry.
 * @returns An async callback. Pass a source string, or `{ retryRejectedKyc: true }` from the KYC failure page.
 */
export const useOpenVbaOnboarding = (
  defaultSource = 'unspecified',
): ((request?: string | OpenVbaOnboardingRequest) => Promise<void>) => {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(
    async (request?: string | OpenVbaOnboardingRequest): Promise<void> => {
      const { source, retryRejectedKyc } = resolveOpenRequest(
        request,
        defaultSource,
      );
      try {
        const walletAddress = selectSelectedVbaWalletAddress(
          ReduxService.store.getState() as RootState,
        );
        if (!walletAddress) {
          openRecoverableError(navigation);
          return;
        }

        const accountSnapshot: RampsVbaOnboardingSnapshot =
          applyVbaDevOverrides(
            await Engine.context.RampsController.hydrateVbaOnboarding({
              walletAddress,
            }),
          );
        if (
          accountSnapshot.sessionExists &&
          !accountSnapshot.vendorDisclaimersComplete
        ) {
          try {
            const vendorTermsAcceptance =
              await getVbaVendorTermsAcceptance(walletAddress);
            if (vendorTermsAcceptance?.disclaimerIds.length) {
              await Engine.context.KycController.recordVendorDisclaimers({
                disclaimerIds: vendorTermsAcceptance.disclaimerIds,
              });
            }
          } catch (error) {
            Logger.error(error as Error, {
              tags: { feature: 'vba-onboarding' },
              context: {
                name: 'useOpenVbaOnboarding',
                data: { source, step: 'recordVendorDisclaimers' },
              },
            });
          }
        }
        const snapshot: VbaOnboardingSnapshot = {
          ...accountSnapshot,
          vendorTermsAcceptedLocally:
            accountSnapshot.vendorDisclaimersComplete ||
            (await hasAcceptedVbaVendorTerms(walletAddress)),
        };
        const hydratedDestination = getVbaDestinationForSnapshot(snapshot);
        const destinationId =
          retryRejectedKyc && hydratedDestination === 'kycRejected'
            ? 'identityVerification'
            : hydratedDestination;
        Logger.log('[vba-onboarding] resume', {
          source,
          snapshot,
          destinationId,
        });
        if (retryRejectedKyc && destinationId === 'identityVerification') {
          navigation.dispatch(
            StackActions.push(VbaOnboardingRoutes.IDENTITY_VERIFICATION, {
              snapshot,
            }),
          );
          return;
        }
        navigateToVbaOnboardingDestination(navigation, destinationId, snapshot);
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-onboarding' },
          context: {
            name: 'useOpenVbaOnboarding',
            data: { source },
          },
        });
        openRecoverableError(navigation);
      }
    },
    [navigation, defaultSource],
  );
};
