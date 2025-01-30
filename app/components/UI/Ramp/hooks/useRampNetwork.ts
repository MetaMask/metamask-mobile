import { useSelector } from 'react-redux';
import {
  chainIdSelector,
  getRampNetworks,
} from '../../../../reducers/fiatOrders';
import {
  isNetworkRampNativeTokenSupported,
  isNetworkRampSupported,
} from '../utils';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
// TODO(ramp): Remove this import when keyring-snaps is removed
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import {
  isBtcAccount,
  isSolanaAccount,
} from '../../../../core/Multichain/utils';
import { MultichainNetworks } from '../../../../core/Multichain/constants';
///: END:ONLY_INCLUDE_IF

/**
 * Hook that returns a tuple of boolean indicating if the network is supported and the native token is supported
 * @returns {[boolean, boolean]} [isNetworkBuySupported, isNativeTokenBuySupported]
 */
function useRampNetwork() {
  const chainId = useSelector(chainIdSelector);
  const networks = useSelector(getRampNetworks);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  // TODO(ramp): Remove this when keyring-snaps is removed or chainId is available
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  if (selectedInternalAccount) {
    if (isSolanaAccount(selectedInternalAccount)) {
      return [
        isNetworkRampSupported(MultichainNetworks.SOLANA, networks),
        isNetworkRampNativeTokenSupported(MultichainNetworks.SOLANA, networks),
      ] as const;
    } else if (isBtcAccount(selectedInternalAccount)) {
      return [
        isNetworkRampSupported(MultichainNetworks.BITCOIN, networks),
        isNetworkRampNativeTokenSupported(MultichainNetworks.BITCOIN, networks),
      ] as const;
    }
  }
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  return [
    isNetworkRampSupported(chainId, networks),
    isNetworkRampNativeTokenSupported(chainId, networks),
  ] as const;
}

export default useRampNetwork;
