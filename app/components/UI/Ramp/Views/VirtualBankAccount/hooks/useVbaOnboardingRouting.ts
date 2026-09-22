import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import ReduxService from '../../../../../../core/redux';
import Logger from '../../../../../../util/Logger';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import type { RootState } from '../../../../../../reducers';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  completeVbaFunnelStep,
  getVbaRouteForSnapshot,
  type VbaFunnelStepId,
  type VbaOnboardingRoute,
} from '../vbaOnboardingFunnel';
import {
  EMPTY_VBA_ONBOARDING_SNAPSHOT,
  type VbaOnboardingSnapshot,
} from '../vbaOnboardingSnapshot';
import { hasAcceptedVbaTermsOne } from '../vbaTermsOneStorage';

let lastVbaOnboardingSnapshot: VbaOnboardingSnapshot =
  EMPTY_VBA_ONBOARDING_SNAPSHOT;

export const getLastVbaOnboardingSnapshot = (): VbaOnboardingSnapshot =>
  lastVbaOnboardingSnapshot;

export const setLastVbaOnboardingSnapshot = (
  snapshot: VbaOnboardingSnapshot,
): void => {
  lastVbaOnboardingSnapshot = snapshot;
};

export const resetVbaOnboardingSnapshotCache = (): void => {
  lastVbaOnboardingSnapshot = EMPTY_VBA_ONBOARDING_SNAPSHOT;
};

export const navigateToVbaOnboardingRoute = (
  navigation: AppNavigationProp,
  route: VbaOnboardingRoute,
): void => {
  if (route === Routes.MONEY.HOME) {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    return;
  }
  navigation.navigate(route);
};

const openRecoverableError = (navigation: AppNavigationProp): void => {
  navigateToVbaOnboardingRoute(navigation, Routes.RAMP.VBA_ONBOARDING_ERROR);
};

/**
 * Re-hydrates VBA onboarding facts from RampsController and navigates to the
 * first incomplete funnel step. Use at entry points and retry, not after a
 * successful local CTA.
 *
 * @param defaultSource - Caller/entry point for error telemetry.
 * @returns An async callback accepting an optional `source` override.
 */
export const useResumeVbaOnboarding = (
  defaultSource = 'unspecified',
): ((source?: string) => Promise<void>) => {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(
    async (source: string = defaultSource): Promise<void> => {
      try {
        const walletAddress = selectSelectedVbaWalletAddress(
          ReduxService.store.getState() as RootState,
        );
        if (!walletAddress) {
          openRecoverableError(navigation);
          return;
        }

        const accountSnapshot =
          (await Engine.context.RampsController.hydrateVbaOnboarding({
            walletAddress,
          })) as Omit<VbaOnboardingSnapshot, 'termsOneAccepted'>;
        const snapshot: VbaOnboardingSnapshot = {
          ...accountSnapshot,
          termsOneAccepted:
            accountSnapshot.vendorDisclaimersComplete ||
            (await hasAcceptedVbaTermsOne(walletAddress)),
        };
        setLastVbaOnboardingSnapshot(snapshot);
        navigateToVbaOnboardingRoute(
          navigation,
          getVbaRouteForSnapshot(snapshot),
        );
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-onboarding' },
          context: {
            name: 'useResumeVbaOnboarding',
            source,
          },
        });
        openRecoverableError(navigation);
      }
    },
    [navigation, defaultSource],
  );
};

/**
 * Advances the Mobile funnel after a successful local action without
 * re-hydrating (avoids backend lag sending the user backward).
 *
 * @param stepId - Funnel step the user just completed.
 * @returns A callback that navigates to the next incomplete step.
 */
export const useAdvanceVbaOnboarding = (
  stepId: VbaFunnelStepId,
): (() => void) => {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(() => {
    const snapshot = completeVbaFunnelStep(
      getLastVbaOnboardingSnapshot(),
      stepId,
    );
    setLastVbaOnboardingSnapshot(snapshot);
    navigateToVbaOnboardingRoute(navigation, getVbaRouteForSnapshot(snapshot));
  }, [navigation, stepId]);
};
