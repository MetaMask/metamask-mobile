import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

export const handleBatchSellUrl = async () => {
  DevLogger.log('[handleBatchSellUrl] Opening Batch Sell token selector');

  try {
    NavigationService.navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
    });
  } catch (error) {
    DevLogger.log('Failed to handle batch sell deeplink:', error);
    NavigationService.navigation.navigate(Routes.WALLET.HOME);
  }
};
