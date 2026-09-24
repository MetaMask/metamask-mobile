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
import type { VbaOnboardingSnapshot as RampsVbaOnboardingSnapshot } from '@metamask/ramps-controller';
import type { VbaOnboardingSnapshot } from '../vbaOnboardingSnapshot';
import { hasAcceptedVbaVendorTerms } from '../vbaVendorTermsStorage';

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

        const accountSnapshot: RampsVbaOnboardingSnapshot =
          await Engine.context.RampsController.hydrateVbaOnboarding({
            walletAddress,
          });
        const snapshot: VbaOnboardingSnapshot = {
          ...accountSnapshot,
          vendorTermsAcceptedLocally:
            accountSnapshot.vendorDisclaimersComplete ||
            (await hasAcceptedVbaVendorTerms(walletAddress)),
        };
        const route = getVbaRouteForSnapshot(snapshot);
        Logger.log('[vba-onboarding] resume', { source, snapshot, route });
        navigateToVbaOnboardingRoute(navigation, route);
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
