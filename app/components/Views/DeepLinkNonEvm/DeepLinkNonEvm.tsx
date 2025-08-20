import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from '../../../util/navigation/navUtils';
import { RootState } from '../../../reducers';
import Routes from '../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { BridgeViewMode } from '../../UI/Bridge/types';
import { selectAccountsWithNativeBalanceByChainId } from '../../../selectors/multichain';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { BtcScope, SolScope } from '@metamask/keyring-api';

interface DeepLinkNonEvmParams {
  chainId: string;
}

const getClientType = (chainId: string) => {
  let clientType: WalletClientType;
  if (Object.values(BtcScope).includes(chainId as BtcScope)) {
    clientType = WalletClientType.Bitcoin;
  } else if (Object.values(SolScope).includes(chainId as SolScope)) {
    clientType = WalletClientType.Solana;
  } else {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }

  return clientType;
};

export function DeepLinkNonEvm() {
  const navigation = useNavigation();
  const params = useParams<DeepLinkNonEvmParams>();
  const { chainId } = params;

  const accountsWithNativeBalance = useSelector((state: RootState) =>
    selectAccountsWithNativeBalanceByChainId(state, { chainId }),
  );

  useEffect(() => {
    if (Object.keys(accountsWithNativeBalance).length > 0) {
      const [accountId] = Object.keys(accountsWithNativeBalance);

      if (accountId) {
        // if the account has funds, navigate to swaps
        navigation.navigate(Routes.BRIDGE.ROOT, {
          screen: Routes.BRIDGE.BRIDGE_VIEW,
          params: {
            sourcePage: 'deeplink',
            bridgeViewMode: BridgeViewMode.Unified,
          },
        });
      } else {
        // if the account has no funds, navigate to ramps
        navigation.navigate(Routes.RAMP.BUY, {
          chainId,
        });
      }
    } else {
      // if there are no accounts in the scope, show the modal to create an account
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ADD_ACCOUNT,
        params: {
          clientType: getClientType(chainId),
          scope: chainId,
        },
      });
    }
  }, [chainId, navigation, accountsWithNativeBalance]);

  return null;
}
