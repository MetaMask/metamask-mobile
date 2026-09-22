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
  getVbaRouteForSnapshot,
  type VbaOnboardingRoute,
} from '../vbaOnboardingFunnel';
import type { VbaOnboardingSnapshot } from '../vbaOnboardingSnapshot';
import { hasAcceptedVbaTermsOne } from '../vbaTermsOneStorage';

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
 * Hydrates VBA onboarding facts from RampsController and navigates to the
 * first incomplete funnel step. Use at entry points and retry, not after a
 * successful local CTA.
 *
 * @param defaultSource - Caller/entry point for error telemetry.
 * @returns An async callback accepting an optional `source` override.
 */
export const useOpenVbaOnboarding = (
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
        const route = getVbaRouteForSnapshot(snapshot);
        Logger.log('[vba-onboarding] resume', { source, snapshot, route });
        navigateToVbaOnboardingRoute(navigation, route);
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-onboarding' },
          context: {
            name: 'useOpenVbaOnboarding',
            source,
          },
        });
        openRecoverableError(navigation);
      }
    },
    [navigation, defaultSource],
  );
};
