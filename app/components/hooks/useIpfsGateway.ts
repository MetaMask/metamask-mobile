import { useSelector } from 'react-redux';
import AppConstants from '../../core/AppConstants';
import { selectIpfsGateway } from '../../selectors/preferencesController';

const IPFS_DEFAULT_GATEWAY_URL = AppConstants.IPFS_DEFAULT_GATEWAY_URL;

function useIpfsGateway(): string {
  const selectedIpfsGateway = useSelector(selectIpfsGateway);

  return selectedIpfsGateway || IPFS_DEFAULT_GATEWAY_URL;
}

export default useIpfsGateway;
