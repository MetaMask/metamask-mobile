import { useSelector } from 'react-redux';
import {
  chainIdSelector,
  getRampNetworks,
} from '../../../../reducers/fiatOrders';
import {
  isNetworkBuyNativeTokenSupported,
  isNetworkBuySupported,
} from '../utils';

/**
 * Hook that returns a tuple of boolean indicating if the network is supported and the native token is supported
 * @returns {[boolean, boolean]} [isNetworkBuySupported, isNativeTokenBuySupported]
 */
function useOnRampNetwork() {
  const chainId = useSelector(chainIdSelector);
  const networks = useSelector(getRampNetworks);

  return [
    isNetworkBuySupported(chainId, networks),
    isNetworkBuyNativeTokenSupported(chainId, networks),
  ] as const;
}

export default useOnRampNetwork;
