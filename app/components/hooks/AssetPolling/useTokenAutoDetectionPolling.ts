import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectAllDetectedTokensForSelectedAddress } from '../../../selectors/tokensController';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { Hex } from '@metamask/utils';

interface TokenDetectionPollingInput {
  chainIds: Hex[];
  address: string;
}

const useTokenDetectionPolling = () => {
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);

  const filteredNetworkConfigurations = Object.values(
    networkConfigurations,
  ).filter(
    (networkConfiguration) =>
      !['0x5', '0xe704'].includes(networkConfiguration.chainId),
  );

  const useTokenDetection = useSelector(selectUseTokenDetection);
  const chainIds = Object.values(filteredNetworkConfigurations).map(
    (networkConfiguration) => networkConfiguration.chainId,
  );

  const detectedTokens = useSelector(selectAllDetectedTokensForSelectedAddress);

  const { TokenDetectionController } = Engine.context;

  const pollingInput: TokenDetectionPollingInput[] = [
    {
      chainIds: chainIds as Hex[],
      address: selectedAddress ?? '',
    },
  ];

  usePolling({
    startPolling: TokenDetectionController.startPolling.bind(
      TokenDetectionController,
    ),
    stopPollingByPollingToken:
      TokenDetectionController.stopPollingByPollingToken.bind(
        TokenDetectionController,
      ),
    input: useTokenDetection ? pollingInput : [{ chainIds: [], address: '' }],
  });

  return {
    detectedTokens,
  };
};

export default useTokenDetectionPolling;
