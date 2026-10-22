import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';

/**
 * Deeplink intent for the Money account deposit bridge route.
 *
 * Eligibility and deposit setup require React hooks and therefore stay in the
 * bridge component mounted by this route.
 */
export const createMoneyDepositDeeplinkIntent = (): DeeplinkIntent => ({
  target: {
    type: 'main-stack',
    routeName: Routes.MONEY.DEPOSIT_DEEPLINK,
  },
});

export const handleMoneyDeposit = async () => {
  DevLogger.log('[handleMoneyDeposit] Starting deeplink handling');

  try {
    await executeDeeplinkIntent(createMoneyDepositDeeplinkIntent());
  } catch (error) {
    DevLogger.log(
      '[handleMoneyDeposit] Failed to execute the bridge route intent:',
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
