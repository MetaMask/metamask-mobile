import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { isCaipChainId } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import ReduxService from '../../../redux';
import { selectAccountsWithNativeBalanceByChainId } from '../../../../selectors/multichain';
import { BridgeViewMode } from '../../../../components/UI/Bridge/types';
import { BridgeRouteParams } from '../../../../components/UI/Bridge/Views/BridgeView';
import { WalletClientType } from '../../../SnapKeyring/MultichainWalletSnapClient';
import {
  BtcScope,
  SolScope,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import BigNumber from 'bignumber.js';
import { getNativeSourceToken } from '../../../../components/UI/Bridge/utils/tokenUtils';

const getClientType = (chainId: string) => {
  let clientType: WalletClientType;
  if (Object.values(BtcScope).includes(chainId as BtcScope)) {
    clientType = WalletClientType.Bitcoin;
  } else if (Object.values(SolScope).includes(chainId as SolScope)) {
    clientType = WalletClientType.Solana;
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
  } else if (Object.values(TrxScope).includes(chainId as TrxScope)) {
    clientType = WalletClientType.Tron;
    ///: END:ONLY_INCLUDE_IF
  } else {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }

  return clientType;
};

export function handleCreateAccountUrl({
  path,
  navigation,
}: {
  path: string;
  navigation: NavigationProp<ParamListBase>;
}) {
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

  if (!hasAccountsInScope) {
    // if there are no accounts in the scope, show the modal to create an account
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ADD_ACCOUNT,
      params: {
        clientType: getClientType(chainId),
        scope: chainId,
      },
    });
    return;
  }

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
    };

    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params,
    });

    return;
  }

  // if there are account in scope bu non of them have funds, navigate to ramps
  navigation.navigate(Routes.RAMP.BUY, {
    screen: Routes.RAMP.GET_STARTED,
    params: {
      chainId,
    },
  });
}
