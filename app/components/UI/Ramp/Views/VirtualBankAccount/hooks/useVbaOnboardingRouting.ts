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

type VbaOnboardingScreenName =
  (typeof VbaOnboardingRoutes)[keyof typeof VbaOnboardingRoutes];

interface StackController {
  dispatch: (action: ReturnType<typeof CommonActions.reset>) => void;
  getParent: () => StackController | undefined;
  getState: () => NavigationState | undefined;
}

const DEFAULT_CALLER_ROUTE = {
  name: Routes.HOME_TABS,
  params: {
    screen: Routes.MONEY.ROOT,
    params: { screen: Routes.MONEY.HOME },
  },
};

const getCallerRoute = (state: NavigationState) => {
  const activeRoute = state.routes[state.index];
  if (activeRoute?.name !== Routes.RAMP.VBA_ONBOARDING) {
    return activeRoute ?? DEFAULT_CALLER_ROUTE;
  }

  return state.routes[state.index - 1] ?? DEFAULT_CALLER_ROUTE;
};

/**
 * Keeps exactly two root routes: the screen that opened onboarding and the
 * current onboarding destination. Back then always returns to the caller.
 *
 * A step change that is already inside onboarding resets that stack in place.
 * Resetting the root route without its existing key destroys the native screen,
 * and the splash shows through that gap.
 */
export const openAsOnlyOnboardingRoute = (
  navigation: AppNavigationProp,
  screen: VbaOnboardingScreenName,
  params?: NonNullable<VbaOnboardingParamList[VbaOnboardingScreenName]>,
): void => {
  const route =
    params === undefined ? { name: screen } : { name: screen, params };
  let current: StackController | undefined =
    navigation as unknown as StackController;

  while (current) {
    const state = current.getState();
    if (state?.routeNames.includes(VbaOnboardingRoutes.VENDOR_TERMS)) {
      current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [route],
        }),
      );
      return;
    }

    if (state?.routeNames.includes(Routes.RAMP.VBA_ONBOARDING)) {
      const existingOnboardingRoute = state.routes.find(
        (candidate) => candidate.name === Routes.RAMP.VBA_ONBOARDING,
      );
      current.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            // A live route has `stale: false`, which PartialState will not accept.
            getCallerRoute(
              state,
            ) as PartialState<NavigationState>['routes'][number],
            {
              ...(existingOnboardingRoute?.key
                ? { key: existingOnboardingRoute.key }
                : {}),
              name: Routes.RAMP.VBA_ONBOARDING,
              state: { index: 0, routes: [route] },
            },
          ],
        }),
      );
      return;
    }

    const parent = current.getParent();
    if (!parent || parent === current) {
      break;
    }
    current = parent;
  }
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
    sourceCurrency: VbaOnboardingRoutes.SOURCE_CURRENCY,
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
              refreshKyc: true,
              refreshAutoramps: true,
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
