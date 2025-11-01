import { useSelector } from 'react-redux';
import {
  selectNetworkImageSource,
  selectNetworkName,
} from '../../../../../selectors/networkInfos';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../../../selectors/networkController';

/**
 * Sample useSampleCounter hook
 *
 * @sampleFeature do not use in production code
 */
function useSampleNetwork() {
  const networkImageSource = useSelector(selectNetworkImageSource);
  const chainId = useSelector(selectChainId);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const name = useSelector(selectNetworkName);
  const networkName = networkConfigurations?.[chainId]?.name ?? name;

  return {
    networkImageSource,
    chainId,
    networkName,
  };
}

export default useSampleNetwork;
