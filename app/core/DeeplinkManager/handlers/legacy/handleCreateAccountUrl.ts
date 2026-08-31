import { isCaipChainId } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import ReduxService from '../../../redux';
import { selectAccountsWithNativeBalanceByChainId } from '../../../../selectors/multichain';
import { BridgeViewMode } from '../../../../components/UI/Bridge/types';
import { BridgeRouteParams } from '../../../../components/UI/Bridge/hooks/useSwapBridgeNavigation';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import BigNumber from 'bignumber.js';
import { getNativeSourceToken } from '../../../../components/UI/Bridge/utils/tokenUtils';
import NavigationService from '../../../NavigationService';

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

  const hasAccountsInScope = Object.keys(accountsBalanceInScope).length > 0;

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
    const params: BridgeRouteParams = {
      sourceToken,
      sourcePage: 'deeplink',
      bridgeViewMode: BridgeViewMode.Unified,
      location: MetaMetricsSwapsEventSource.MainView,
    };

    NavigationService.navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params,
    });

    return;
  }

  // if there are account in scope bu non of them have funds, navigate to ramps
  NavigationService.navigation.navigate(Routes.RAMP.BUY, {
    screen: Routes.RAMP.GET_STARTED,
    params: {
      chainId,
    },
  });
}
