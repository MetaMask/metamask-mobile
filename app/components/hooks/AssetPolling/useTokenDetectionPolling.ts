import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectIsAllNetworks,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { getNetworkConfigurationsToPoll } from './utils';

const useTokenDetectionPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const useTokenDetection = useSelector(selectUseTokenDetection);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

  const networkConfigurationsToPoll = getNetworkConfigurationsToPoll(
    networkConfigurations,
    currentChainId,
    isAllNetworksSelected,
  );

  // if all networks are selected, poll all popular networks
  const filteredChainIds = isAllNetworksSelected
    ? networkConfigurationsToPoll.map((network) => network.chainId)
    : [currentChainId];

  // if portfolio view is enabled, poll all chain ids
  const chainIdsToPoll = isPortfolioViewEnabled()
    ? chainIds ?? filteredChainIds
    : [currentChainId];

  const { TokenDetectionController } = Engine.context;

  usePolling({
    startPolling: TokenDetectionController.startPolling.bind(
      TokenDetectionController,
    ),
    stopPollingByPollingToken:
      TokenDetectionController.stopPollingByPollingToken.bind(
        TokenDetectionController,
      ),
    input: useTokenDetection
      ? [
          {
            chainIds: chainIdsToPoll as Hex[],
            address: selectedAccount?.address as Hex,
          },
        ]
      : [],
  });

  return {};
};

export default useTokenDetectionPolling;
