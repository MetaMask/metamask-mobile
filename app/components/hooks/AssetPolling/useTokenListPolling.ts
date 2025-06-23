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
import {
  selectERC20TokensByChain,
  selectTokenList,
} from '../../../selectors/tokenListController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

const useTokenListPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const currentChainId = useSelector(selectEvmChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  // Selectors returning state updated by the polling
  const tokenList = useSelector(selectTokenList);
  const tokenListByChain = useSelector(selectERC20TokensByChain);

  // if all networks are selected, poll all popular networks
  const filteredChainIds =
    isAllNetworksSelected && isPopularNetwork && isPortfolioViewEnabled()
      ? Object.values(networkConfigurationsPopularNetworks).map(
          (network) => network.chainId,
        )
      : [currentChainId];

  const chainIdsToPoll = chainIds ?? filteredChainIds;

  const { TokenListController } = Engine.context;

  usePolling({
    startPolling: TokenListController.startPolling.bind(TokenListController),
    stopPollingByPollingToken:
      TokenListController.stopPollingByPollingToken.bind(TokenListController),
    input: isEvmSelected
      ? chainIdsToPoll.map((chainId) => ({ chainId: chainId as Hex }))
      : [],
  });

  return {
    tokenList,
    tokenListByChain,
  };
};

export default useTokenListPolling;
