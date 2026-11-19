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
import {
  findUsableVbaAutoramp,
  selectSelectedVbaWalletAddress,
} from '../../../../../../selectors/rampsController';
import type { RootState } from '../../../../../../reducers';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  getVbaDestinationForSnapshot,
  type VbaOnboardingDestinationId,
} from '../vbaOnboardingFunnel';
import type { VbaOnboardingSnapshot } from '../vbaOnboardingSnapshot';
import { recordVbaOnboardingSnapshot } from '../vbaAnalytics';
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
import { startVbaKycSession } from '../vbaKycSession';
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

/**
 * Leaves KYC for Money home. KYC screens call this through an `onExit`
 * prop so the destination stays with the VBA caller.
 *
 * @param navigation - Navigation from the KYC screen's VBA adapter.
 */
export const exitVbaOnboardingToMoneyHome = (
  navigation: AppNavigationProp,
): void => {
  navigation.navigate(Routes.HOME_TABS, {
    screen: Routes.MONEY.ROOT,
    params: { screen: Routes.MONEY.HOME },
  });
};

type ResetRoute = PartialState<NavigationState>['routes'][number];

const isVbaRootRoute = (name: string | undefined): boolean =>
  name === Routes.RAMP.VBA_ONBOARDING || name === Routes.RAMP.VBA_DETAILS;

/**
 * Screens that stay under the VBA destination: everything from the bottom of
 * the stack up to and including the screen that opened it.
 *
 * Keeping only that one screen drops whatever it was opened from. Card home
 * sits on wallet home, so bank details would then be the only screen left
 * after one back, and Card home's back button and swipe would do nothing.
 * Falls back to Money home when the stack holds only VBA routes.
 */
const getRoutesUnderDestination = (state: NavigationState): ResetRoute[] => {
  let callerIndex = -1;
  for (let index = state.index; index >= 0; index -= 1) {
    const route = state.routes[index];
    if (route && !isVbaRootRoute(route.name)) {
      callerIndex = index;
      break;
    }
  }

  if (callerIndex < 0) {
    return [VBA_DEFAULT_CALLER_ROUTE];
  }

  // A live route has `stale: false`, which PartialState will not accept.
  return state.routes.slice(0, callerIndex + 1) as ResetRoute[];
};

/**
 * Keeps every screen up to and including the one that opened onboarding, then
 * the current onboarding destination. Back returns to the caller, and the
 * caller's own back still has its previous screen.
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
      const routesUnderDestination = getRoutesUnderDestination(state);
      current.dispatch(
        CommonActions.reset({
          index: routesUnderDestination.length,
          routes: [
            ...routesUnderDestination,
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
 * Keeps every screen up to the caller under the completed account and removes
 * onboarding from the root stack. Header and native-gesture back actions then
 * return directly to the caller instead of revealing the onboarding loader,
 * and the caller can still go back to the screen it came from.
 *
 * @param navigation - Navigation from any screen inside or beside onboarding.
 */
export const openCompletedVbaAccount = (
  navigation: AppNavigationProp,
): void => {
  let current: StackController | undefined =
    navigation as unknown as StackController;

  while (current) {
    const state = current.getState();
    if (state?.routeNames.includes(Routes.RAMP.VBA_ONBOARDING)) {
      const routesUnderDestination = getRoutesUnderDestination(state);
      current.dispatch(
        CommonActions.reset({
          index: routesUnderDestination.length,
          routes: [
            ...routesUnderDestination,
            { name: Routes.RAMP.VBA_DETAILS },
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
 * Opens the step after Identity verified: Choose Currency when
 * `moneyMovementNeobank.chooseCurrency` is on and the location has no resolved
 * market, otherwise account details, which creates the account. A resolved
 * market has exactly one currency, so there is nothing to choose and the
 * picker is skipped. Shared by the Identity verified screen's Continue and the
 * Money home `identity_verified` card, which skips that screen.
 *
 * Inside onboarding (Identity verified), Choose Currency is pushed so Back
 * returns there. From outside it opens as the only onboarding route, so
 * Back returns to the caller.
 *
 * @param navigation - Navigation from Identity verified or an entry surface.
 * @param isChooseCurrencyEnabled - `moneyMovementNeobank.chooseCurrency`.
 * @param sourceCurrency - Currency of the open market serving the user, when
 * one resolved. Its presence means there is nothing to pick.
 */
export const openVbaAccountSetup = (
  navigation: AppNavigationProp,
  isChooseCurrencyEnabled: boolean,
  sourceCurrency?: VbaSourceCurrency,
): void => {
  if (!isChooseCurrencyEnabled || sourceCurrency) {
    openCompletedVbaAccount(navigation);
    return;
  }
  const isInsideOnboarding = Boolean(
    navigation
      .getState?.()
      ?.routeNames?.includes(VbaOnboardingRoutes.CHOOSE_CURRENCY),
  );
  if (isInsideOnboarding) {
    navigation.dispatch(StackActions.push(VbaOnboardingRoutes.CHOOSE_CURRENCY));
    return;
  }
  openAsOnlyOnboardingRoute(navigation, VbaOnboardingRoutes.CHOOSE_CURRENCY);
};

const hasPersistedApprovedAutoramp = (walletAddress: string): boolean => {
  const autoramps = Engine.context.RampsController.state?.autoramps ?? [];
  return findUsableAutoramp(autoramps, walletAddress)?.status === 'Approved';
};

/**
 * True when account details can open from persisted state, with no loading
 * route. Matches the fast path inside {@link openVbaEntry}.
 */
export const canOpenPersistedVbaDetails = (): boolean => {
  const walletAddress = selectSelectedVbaWalletAddress(
    ReduxService.store.getState() as RootState,
  );
  if (!walletAddress || getVbaKycStatusOverride() !== null) {
    return false;
  }
  return hasPersistedApprovedAutoramp(walletAddress);
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
  if (walletAddress && canOpenPersistedVbaDetails()) {
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

const isMissingAal2TokenError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('aal2Token is required');

/**
 * Re-submits capability authorization for a KYC session that already exists.
 * First-time creation stays on the email screen, which also has the signed-in
 * token `startSession` needs when no session exists.
 *
 * Reinstall deletes the persisted session. Hydrate only reads that local
 * session and otherwise returns an empty funnel, so an approved account is
 * shown the create-account screen. The latest vendor session is reattached
 * here, without an AAL2 token, before that read. A missing latest session is
 * a first-time user and must not fail onboarding.
 */
const resumePersistedKycSession = async (): Promise<void> => {
  const kycController = Engine.context.KycController;
  if (!kycController.readSessionStatus()) {
    const existingSession =
      await kycController.getSessionStatusForVendor(VBA_KYC_VENDOR);
    if (!existingSession) {
      return;
    }
  }

  try {
    await startVbaKycSession({
      vendor: VBA_KYC_VENDOR,
    });
  } catch (error) {
    // The latest session can disappear between the lookup and start. Creating
    // one still belongs on the email screen.
    if (!kycController.readSessionStatus() && isMissingAal2TokenError(error)) {
      return;
    }
    throw error;
  }
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
    recordVbaOnboardingSnapshot(snapshot);
    endVbaCufChildTrace(hydrateTraceId, true);
    const funnelDestination = getVbaDestinationForSnapshot(snapshot);
    // An existing autoramp opens the account only when the funnel would send
    // the user back to vendor terms or email, as it does with no KYC session.
    const hasExistingAccount =
      (funnelDestination === 'vendorTerms' || funnelDestination === 'email') &&
      getVbaKycStatusOverride() === null &&
      Boolean(
        findUsableVbaAutoramp(
          Engine.context.RampsController.state?.autoramps ?? [],
          walletAddress,
        ),
      );
    return {
      status: 'ready',
      destinationId: hasExistingAccount ? 'complete' : funnelDestination,
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
