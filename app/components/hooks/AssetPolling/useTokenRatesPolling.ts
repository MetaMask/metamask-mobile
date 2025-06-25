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
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

const useTokenRatesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const currentChainId = useSelector(selectEvmChainId);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  // if all networks are selected, poll all popular networks
  const filteredChainIds =
    isAllNetworksSelected && isPopularNetwork && isPortfolioViewEnabled()
      ? Object.values(networkConfigurationsPopularNetworks).map(
          (network) => network.chainId,
        )
      : [currentChainId];

  const chainIdsToPoll = isEvmSelected
    ? [
        {
          chainIds: filteredChainIds as Hex[],
        },
      ]
    : [];

  const { TokenRatesController } = Engine.context;

  let providedChainIds;
  if (chainIds) {
    providedChainIds = chainIds.map((chainId) => ({
      chainIds: [chainId],
    }));
  }

  const input = providedChainIds ?? chainIdsToPoll;

  usePolling({
    startPolling: TokenRatesController.startPolling.bind(TokenRatesController),
    stopPollingByPollingToken:
      TokenRatesController.stopPollingByPollingToken.bind(TokenRatesController),
    input,
  });
};

export default useTokenRatesPolling;
