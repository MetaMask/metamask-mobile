import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import ReduxService from '../../../../../core/redux';
import Logger from '../../../../../util/Logger';
import { selectSelectedVbaWalletAddress } from '../../../../../selectors/rampsController';
import type { RootState } from '../../../../../reducers';
import Routes from '../../../../../constants/navigation/Routes';
import { getVbaRouteForStage } from './getVbaRouteForStage';

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
 * Re-hydrates VBA onboarding from RampsController and navigates to the
 * route for the returned stage. On failure, opens the recoverable error screen.
 *
 * @param navigation - App navigation.
 */
export const hydrateAndNavigateVbaOnboarding = async (
  navigation: AppNavigationProp,
): Promise<void> => {
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
    navigateToVbaOnboardingRoute(navigation, getVbaRouteForStage(stage));
  } catch (error) {
    Logger.error(error as Error, {
      tags: { feature: 'vba-onboarding' },
      context: {
        name: 'hydrateAndNavigateVbaOnboarding',
      },
    });
    navigateToVbaOnboardingRoute(navigation, Routes.RAMP.VBA_ONBOARDING_ERROR);
  }
};
