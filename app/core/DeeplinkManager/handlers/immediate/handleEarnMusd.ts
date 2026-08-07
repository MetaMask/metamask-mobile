import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import { selectMusdConversionEducationSeen } from '../../../../reducers/user';
import { selectMoneyHubEnabledFlag } from '../../../../components/UI/Money/selectors/featureFlags';
import { selectIsMusdConversionGeoEligible } from '../../../../components/UI/Earn/selectors/eligibility';

/**
 * Handler for earn-musd deeplink
 *
 * Opens the mUSD education screen which handles:
 * - Showing education content
 * - Determining appropriate action based on user state
 * - Routing to conversion flow, buy flow, or home
 *
 * Supported URL formats:
 * - https://link.metamask.io/earn-musd
 * - metamask://earn-musd
 */
export const handleEarnMusd = () => {
  DevLogger.log('[handleEarnMusd] Starting deeplink handling');

  try {
    const state = ReduxService.store.getState();
    const isGeoEligible = selectIsMusdConversionGeoEligible(state);
    const isMoneyHubEnabled = selectMoneyHubEnabledFlag(state);
    const hasSeenEducationScreen = selectMusdConversionEducationSeen(state);

    // Always show education screen if user has not seen it regardless of geo eligibility.
    if (!hasSeenEducationScreen) {
      NavigationService.navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: { isDeeplink: true },
      });
      return;
    }

    if (!isGeoEligible) {
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
      return;
    }

    if (isMoneyHubEnabled) {
      NavigationService.navigation.navigate(
        Routes.WALLET.CASH_TOKENS_FULL_VIEW,
      );
      return;
    }

    NavigationService.navigation.navigate(Routes.WALLET.HOME);
  } catch (error) {
    DevLogger.log('[handleEarnMusd] Failed to handle deeplink:', error);
    Logger.error(
      error as Error,
      '[handleEarnMusd] Error handling earn-musd deeplink',
    );

    try {
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleEarnMusd] Failed to navigate to fallback screen',
      );
    }
  }
};
