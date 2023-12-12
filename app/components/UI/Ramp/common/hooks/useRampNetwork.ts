import { useSelector } from 'react-redux';
import {
  chainIdSelector,
  getRampNetworks,
} from '../../../../../reducers/fiatOrders';
import {
  isNetworkRampNativeTokenSupported,
  isNetworkRampSupported,
} from '../utils';

/**
 * Hook that returns a tuple of boolean indicating if the network is supported and the native token is supported
 * @returns {[boolean, boolean]} [isNetworkBuySupported, isNativeTokenBuySupported]
 */
function useRampNetwork() {
  const chainId = useSelector(chainIdSelector);
  const networks = useSelector(getRampNetworks);

  return [
    isNetworkRampSupported(chainId, networks),
    isNetworkRampNativeTokenSupported(chainId, networks),
  ] as const;
}

export default useRampNetwork;
