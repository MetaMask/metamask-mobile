import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Engine from '../../../../../../core/Engine';
import ReduxService from '../../../../../../core/redux';
import Logger from '../../../../../../util/Logger';
import { selectSelectedVbaWalletAddress } from '../../../../../../selectors/rampsController';
import type { RootState } from '../../../../../../reducers';
import Routes from '../../../../../../constants/navigation/Routes';
import { getVbaRouteForStage } from '../getVbaRouteForStage';

export const navigateToVbaOnboardingRoute = (
  navigation: AppNavigationProp,
  route: ReturnType<typeof getVbaRouteForStage>,
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

/**
 * Returns a callback that re-hydrates VBA onboarding from RampsController and
 * navigates to the route for the returned stage. On failure, opens the
 * recoverable error screen. Navigation is resolved from {@link useNavigation},
 * so callers only supply the telemetry `source`.
 *
 * @param defaultSource - Caller/entry point, attached to error telemetry for
 * context. Can be overridden per call for dynamic sources.
 * @returns An async callback accepting an optional `source` override.
 */
export const useVbaOnboardingRouting = (
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
          navigateToVbaOnboardingRoute(
            navigation,
            Routes.RAMP.VBA_ONBOARDING_ERROR,
          );
          return;
        }

        const stage = await Engine.context.RampsController.hydrateVbaOnboarding({
          walletAddress,
        });
        const route = getVbaRouteForStage(stage);
        navigateToVbaOnboardingRoute(navigation, route);
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'vba-onboarding' },
          context: {
            name: 'useVbaOnboardingRouting',
            source,
          },
        });
        navigateToVbaOnboardingRoute(
          navigation,
          Routes.RAMP.VBA_ONBOARDING_ERROR,
        );
      }
    },
    [navigation, defaultSource],
  );
};
