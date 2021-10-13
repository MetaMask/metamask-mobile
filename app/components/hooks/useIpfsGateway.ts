import { useSelector } from 'react-redux';

const DEFAULT_GATEWAY = 'https://ipfs.io/ipfs/';

function useIpfsGateway(): string {
	const selectedIpfsGateway = useSelector(
		(state: any) => state.engine.backgroundState.PreferencesController.ipfsGateway
	);

	return selectedIpfsGateway || DEFAULT_GATEWAY;
}

export default useIpfsGateway;
