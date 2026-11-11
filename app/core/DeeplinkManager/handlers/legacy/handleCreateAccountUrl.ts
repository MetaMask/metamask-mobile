import { isCaipChainId } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import ReduxService from '../../../redux';
import { selectAccountsWithNativeBalanceByChainId } from '../../../../selectors/multichain';
import { BridgeViewMode } from '../../../../components/UI/Bridge/types';
import {
  getNativeAssetForChainId,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import BigNumber from 'bignumber.js';
import { getNativeSourceToken } from '../../../../components/UI/Bridge/utils/tokenUtils';
import { startSwapBridgePageLoadTrace } from '../../../../components/UI/Bridge/utils/swapBridgePageLoadTrace';
import NavigationService from '../../../NavigationService';
import { resetSwapSessionBeforeDeeplink } from '../../utils/resetSwapSessionBeforeDeeplink';

export function handleCreateAccountUrl({ path }: { path: string }) {
  const chainId = new URLSearchParams(path).get('chainId');

  if (!chainId || !isCaipChainId(chainId)) {
    return;
  }

  const state = ReduxService.store.getState();

  const accountsBalanceInScope = selectAccountsWithNativeBalanceByChainId(
    state,
    { chainId },
  );

  const accountIdWithNativeBalanceGreaterThanZero = Object.keys(
    accountsBalanceInScope,
  ).find((accountId) => {
    const { amount } = accountsBalanceInScope[accountId];
    return new BigNumber(amount ?? 0).gt(0);
  });

  // if there are accounts in the scope, check if it has fund
  if (accountIdWithNativeBalanceGreaterThanZero) {
    const sourceToken = getNativeSourceToken(chainId);

    // this will make the bridge view open with the correct source token
    const params = startSwapBridgePageLoadTrace({
      sourceToken,
      sourcePage: 'deeplink',
      bridgeViewMode: BridgeViewMode.Unified,
      location: MetaMetricsSwapsEventSource.MainView,
    });

    resetSwapSessionBeforeDeeplink();

    NavigationService.navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params,
    });

    return;
  }

  // Pass the native asset to the Buy quote screen so it selects its currency.
  const { assetId } = getNativeAssetForChainId(chainId);

  NavigationService.navigation.navigate(Routes.RAMP.BUY, {
    screen: Routes.RAMP.ID,
    params: {
      screen: Routes.RAMP.BUILD_QUOTE,
      params: { assetId },
    },
  });
}
