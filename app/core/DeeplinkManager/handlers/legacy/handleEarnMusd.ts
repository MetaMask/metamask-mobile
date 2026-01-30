import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';

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
    NavigationService.navigation.navigate(Routes.EARN.ROOT, {
      screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
      params: { isDeeplink: true },
    });
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
