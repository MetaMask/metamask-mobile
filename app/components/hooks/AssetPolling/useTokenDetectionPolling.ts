import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectAllPopularNetworkConfigurations,
  selectEvmChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';

const useTokenDetectionPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const currentChainId = useSelector(selectEvmChainId);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const useTokenDetection = useSelector(selectUseTokenDetection);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);

  // if all networks are selected, poll all popular networks
  const filteredChainIds =
    isAllNetworksSelected && isPopularNetwork && isPortfolioViewEnabled()
      ? Object.values(networkConfigurationsPopularNetworks).map(
          (network) => network.chainId,
        )
      : [currentChainId];

  // if portfolio view is enabled, poll all chain ids
  const chainIdsToPoll = chainIds ?? filteredChainIds;

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
