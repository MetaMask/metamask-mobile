import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import Routes from '../../../../constants/navigation/Routes';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectBatchSellEnabled } from '../../../../selectors/featureFlagController/batchSell';
import { isHardwareAccount } from '../../../../util/address';
import AppConstants from '../../../AppConstants';
import NavigationService from '../../../NavigationService';
import ReduxService from '../../../redux';
import { selectIsSwapsEnabled } from '../../../redux/slices/bridge';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

export const handleBatchSellUrl = async () => {
  DevLogger.log('[handleBatchSellUrl] Opening Batch Sell token selector');

  try {
    const state = ReduxService.store.getState();
    const isBatchSellEnabled = selectBatchSellEnabled(state);
    const isSwapsEnabled = selectIsSwapsEnabled(state);
    const selectedAddress = selectSelectedInternalAccountAddress(state);
    const isHardwareWallet = selectedAddress
      ? Boolean(isHardwareAccount(selectedAddress))
      : false;

    if (
      !isBatchSellEnabled ||
      !isSwapsEnabled ||
      !AppConstants.SWAPS.ACTIVE ||
      isHardwareWallet
    ) {
      DevLogger.log('[handleBatchSellUrl] Batch Sell is disabled');
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
      return;
    }

    NavigationService.navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
      params: {
        batchSellLocation: BatchSellMetricsLocation.Deeplink,
      },
    });
  } catch (error) {
    DevLogger.log('Failed to handle batch sell deeplink:', error);
    NavigationService.navigation.navigate(Routes.WALLET.HOME);
  }
};
