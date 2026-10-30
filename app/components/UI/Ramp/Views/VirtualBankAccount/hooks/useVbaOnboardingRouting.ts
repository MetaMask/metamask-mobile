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
import type { VbaOnboardingSnapshot } from '../vbaOnboardingSnapshot';
import {
  getVbaVendorTermsAcceptance,
  hasAcceptedVbaVendorTerms,
} from '../vbaVendorTermsStorage';
import {
  VBA_DEFAULT_CALLER_ROUTE,
  VbaOnboardingRoutes,
  type VbaOnboardingParamList,
} from '../routes';
import {
  accountCreateErrorVariantForDestination,
  isAccountCreateErrorDestination,
  type AccountCreateFailureFields,
} from '../accountCreateError';
import {
  applyVbaDevOverrides,
  getVbaKycStatusOverride,
} from '../vbaDevOverrides';
import { findUsableAutoramp } from '../ensureMusdAutoramp';
import { VBA_KYC_VENDOR } from '../constants';
import type { VbaSourceCurrency } from '../../../../../../util/region/getVbaSourceCurrency';
import { TraceName } from '../../../../../../util/trace';
import { endVbaCufChildTrace, startVbaCufChildTrace } from '../vbaCufTrace';
import { VBA_CUF_END_REASON } from '../vbaCufTags';

type VbaOnboardingScreenName =
  (typeof VbaOnboardingRoutes)[keyof typeof VbaOnboardingRoutes];

type StackNavigationAction = ReturnType<typeof CommonActions.reset>;

interface StackController {
  dispatch: (action: StackNavigationAction) => void;
  getParent: () => StackController | undefined;
  getState: () => NavigationState | undefined;
}

const getCallerRoute = (state: NavigationState) => {
  for (let index = state.index; index >= 0; index -= 1) {
    const route = state.routes[index];
    if (
      route?.name !== Routes.RAMP.VBA_ONBOARDING &&
      route?.name !== Routes.RAMP.VBA_DETAILS
    ) {
      return route;
    }
  }
  return VBA_DEFAULT_CALLER_ROUTE;
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

/**
 * Keeps the original caller under the completed account and removes onboarding
 * from the root stack. Header and native-gesture back actions then return
 * directly to the caller instead of revealing the onboarding loader.
 *
 * @param navigation - Navigation from any screen inside or beside onboarding.
 * @param sourceCurrency - Currency picked on Choose Currency. Omit to use the
 * IP country's currency.
 */
export const openCompletedVbaAccount = (
  navigation: AppNavigationProp,
  sourceCurrency?: VbaSourceCurrency,
): void => {
  let current: StackController | undefined =
    navigation as unknown as StackController;

  while (current) {
    const state = current.getState();
    if (state?.routeNames.includes(Routes.RAMP.VBA_ONBOARDING)) {
      current.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            getCallerRoute(
              state,
            ) as PartialState<NavigationState>['routes'][number],
            sourceCurrency
              ? {
                  name: Routes.RAMP.VBA_DETAILS,
                  params: { sourceCurrency },
                }
              : { name: Routes.RAMP.VBA_DETAILS },
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

const hasPersistedApprovedAutoramp = (walletAddress: string): boolean => {
  const autoramps = Engine.context.RampsController.state?.autoramps ?? [];
  return findUsableAutoramp(autoramps, walletAddress)?.status === 'Approved';
};

/**
 * Cold entry from Money surfaces. An account whose autoramp is already
 * Approved on this device opens its details directly, and onboarding facts
 * refresh in the background. Everyone else gets the loading screen, which
 * hydrates before picking a destination. Dev KYC overrides always take the
 * loading screen so the override still applies.
 *
 * @param navigation - Navigation from the entry surface.
 * @param params - Loading screen params, used when the fast path does not apply.
 */
export const openVbaEntry = (
  navigation: AppNavigationProp,
  params?: NonNullable<VbaOnboardingParamList['VbaOnboardingLoading']>,
): void => {
  const walletAddress = selectSelectedVbaWalletAddress(
    ReduxService.store.getState() as RootState,
  );
  if (
    walletAddress &&
    getVbaKycStatusOverride() === null &&
    hasPersistedApprovedAutoramp(walletAddress)
  ) {
    openCompletedVbaAccount(navigation);
    Engine.context.RampsController.hydrateVbaOnboarding({
      walletAddress,
      refreshKyc: true,
      refreshAutoramps: true,
    }).catch((error: unknown) => {
      Logger.error(error as Error, {
        tags: { feature: 'vba-onboarding' },
        context: { name: 'openVbaEntry', data: { step: 'hydrate' } },
      });
    });
    return;
  }
  openAsOnlyOnboardingRoute(navigation, VbaOnboardingRoutes.LOADING, params);
};

export const navigateToVbaOnboardingDestination = (
  navigation: AppNavigationProp,
  destinationId: VbaOnboardingDestinationId,
  snapshot?: VbaOnboardingSnapshot,
  failure?: AccountCreateFailureFields,
  sourceCurrency?: VbaSourceCurrency,
  retryable?: boolean,
): void => {
  if (destinationId === 'complete') {
    openCompletedVbaAccount(navigation);
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
  if (destinationId === 'identityVerified') {
    openAsOnlyOnboardingRoute(
      navigation,
      VbaOnboardingRoutes.IDENTITY_VERIFIED,
    );
    return;
  }
  if (isAccountCreateErrorDestination(destinationId)) {
    openAsOnlyOnboardingRoute(
      navigation,
      VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR,
      {
        variant: accountCreateErrorVariantForDestination(destinationId),
        ...(failure ? { failure } : {}),
        ...(sourceCurrency ? { sourceCurrency } : {}),
        ...(retryable ? { retryable } : {}),
      },
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
   * Re-enter identity verification when hydrate still reports a KYC session
   * whose status is `retry`. A rejected session stays on the failure page:
   * rejection is terminal and must not request another SumSub token. The
   * retry pushes a new identity screen so SumSub mounts again instead of
   * revealing the previous one.
   */
  retryRejectedKyc?: boolean;
}

/**
 * Re-submits capability authorization for a KYC session that already exists.
 * First-time creation stays on the email screen, which also has the signed-in
 * token `startSession` needs when no session exists.
 */
const resumePersistedKycSession = async (): Promise<void> => {
  const kycController = Engine.context.KycController;
  if (!kycController.readSessionStatus()) {
    return;
  }

  await kycController.startSession({
    vendor: VBA_KYC_VENDOR,
  });
};

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

export type ResolvedVbaOnboarding =
  | {
      status: 'ready';
      destinationId: VbaOnboardingDestinationId;
      snapshot: VbaOnboardingSnapshot;
    }
  | { status: 'error' };

/**
 * Resumes a persisted KYC session, hydrates VBA onboarding facts, and picks
 * the next destination. Does not navigate, sign, or create an autoramp. A
 * missing wallet, a failed session resume, or a thrown hydrate returns
 * `{ status: 'error' }`.
 *
 * @param source - Caller/entry point for error telemetry.
 */
export const resolveVbaOnboarding = async (
  source: string,
): Promise<ResolvedVbaOnboarding> => {
  const hydrateTraceId = startVbaCufChildTrace(TraceName.VbaHydrate);
  try {
    const walletAddress = selectSelectedVbaWalletAddress(
      ReduxService.store.getState() as RootState,
    );
    if (!walletAddress) {
      endVbaCufChildTrace(hydrateTraceId, false, VBA_CUF_END_REASON.ERROR);
      return { status: 'error' };
    }

    await resumePersistedKycSession();

    const accountSnapshot = applyVbaDevOverrides(
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
    endVbaCufChildTrace(hydrateTraceId, true);
    return {
      status: 'ready',
      destinationId: getVbaDestinationForSnapshot(snapshot),
      snapshot,
    };
  } catch (error) {
    endVbaCufChildTrace(hydrateTraceId, false, VBA_CUF_END_REASON.ERROR);
    Logger.error(error as Error, {
      tags: { feature: 'vba-onboarding' },
      context: {
        name: 'useOpenVbaOnboarding',
        data: { source },
      },
    });
    return { status: 'error' };
  }
};

/**
 * Hydrates VBA onboarding facts and opens the first incomplete module. Used
 * for in-flow retry and module completion. Cold entry opens the loading screen
 * first and calls {@link resolveVbaOnboarding} there.
 *
 * @param defaultSource - Caller/entry point for error telemetry.
 * @returns An async callback. Pass a source string, or
 * `{ retryRejectedKyc: true }` to re-enter SumSub when the hydrated KYC
 * status is `retry`.
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
      const resolved = await resolveVbaOnboarding(source);
      if (resolved.status === 'error') {
        openRecoverableError(navigation);
        return;
      }

      try {
        const canReenterSumSub =
          retryRejectedKyc && resolved.snapshot.kycStatus === 'retry';
        const destinationId =
          canReenterSumSub && resolved.destinationId === 'kycRejected'
            ? 'identityVerification'
            : resolved.destinationId;
        Logger.log('[vba-onboarding] resume', {
          source,
          snapshot: resolved.snapshot,
          destinationId,
        });
        if (canReenterSumSub && destinationId === 'identityVerification') {
          navigation.dispatch(
            StackActions.push(VbaOnboardingRoutes.IDENTITY_VERIFICATION, {
              snapshot: resolved.snapshot,
            }),
          );
          return;
        }
        navigateToVbaOnboardingDestination(
          navigation,
          destinationId,
          resolved.snapshot,
        );
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-onboarding' },
          context: {
            name: 'useOpenVbaOnboarding',
            data: { source, step: 'navigate' },
          },
        });
        openRecoverableError(navigation);
      }
    },
    [navigation, defaultSource],
  );
};
