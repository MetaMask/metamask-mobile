import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectIsAllNetworks,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled, isTestNet } from '../../../util/networks';
import {
  selectERC20TokensByChain,
  selectTokenList,
} from '../../../selectors/tokenListController';
import { getNetworkConfigurationsToPoll } from './utils';

const useTokenListPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

  // Selectors returning state updated by the polling
  const tokenList = useSelector(selectTokenList);
  const tokenListByChain = useSelector(selectERC20TokensByChain);

  const networkConfigurationsToPoll = getNetworkConfigurationsToPoll(
    networkConfigurations,
    isAllNetworksSelected,
  );

  // if all networks are selected, poll all popular networks
  const filteredChainIds =
    isAllNetworksSelected && !isTestNet(currentChainId)
      ? networkConfigurationsToPoll.map((network) => network.chainId)
      : [currentChainId];

  const chainIdsToPoll = isPortfolioViewEnabled()
    ? chainIds ?? filteredChainIds
    : [currentChainId];

  const { TokenListController } = Engine.context;

  usePolling({
    startPolling: TokenListController.startPolling.bind(TokenListController),
    stopPollingByPollingToken:
      TokenListController.stopPollingByPollingToken.bind(TokenListController),
    input: chainIdsToPoll.map((chainId) => ({ chainId: chainId as Hex })),
  });

  return {
    tokenList,
    tokenListByChain,
  };
};

export default useTokenListPolling;
