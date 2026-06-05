import Routes from '../../../../constants/navigation/Routes';
import { selectBatchSellEnabled } from '../../../../selectors/featureFlagController/batchSell';
import NavigationService from '../../../NavigationService';
import ReduxService from '../../../redux';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

export const handleBatchSellUrl = async () => {
  DevLogger.log('[handleBatchSellUrl] Opening Batch Sell token selector');

  try {
    const isBatchSellEnabled = selectBatchSellEnabled(
      ReduxService.store.getState(),
    );

    if (!isBatchSellEnabled) {
      DevLogger.log('[handleBatchSellUrl] Batch Sell is disabled');
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
      return;
    }

    NavigationService.navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
    });
  } catch (error) {
    DevLogger.log('Failed to handle batch sell deeplink:', error);
    NavigationService.navigation.navigate(Routes.WALLET.HOME);
  }
};
