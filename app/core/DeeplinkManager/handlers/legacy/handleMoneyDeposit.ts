import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

/**
 * Handles the Money account deposit deeplink by handing control to Routes.MONEY.DEPOSIT_DEEPLINK
 * bridge route. Eligibility and deposit setup require React hooks and therefore
 * stay out of this non-React deeplink handler.
 */
export const handleMoneyDeposit = () => {
  DevLogger.log('[handleMoneyDeposit] Starting deeplink handling');

  try {
    NavigationService.navigation.navigate(Routes.MONEY.DEPOSIT_DEEPLINK);
  } catch (error) {
    DevLogger.log(
      '[handleMoneyDeposit] Failed to navigate to the bridge route:',
      error,
    );
    Logger.error(
      error as Error,
      '[handleMoneyDeposit] Error handling deposit deeplink',
    );

    try {
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
    } catch (fallbackError) {
      Logger.error(
        fallbackError as Error,
        '[handleMoneyDeposit] Failed to navigate to fallback screen',
      );
    }
  }
};
