import { useSelector } from 'react-redux';
import AppConstants from '../../core/AppConstants';

const IPFS_DEFAULT_GATEWAY_URL = AppConstants.IPFS_DEFAULT_GATEWAY_URL;

function useIpfsGateway(): string {
  const selectedIpfsGateway = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.ipfsGateway,
  );

  return selectedIpfsGateway || IPFS_DEFAULT_GATEWAY_URL;
}

export default useIpfsGateway;
