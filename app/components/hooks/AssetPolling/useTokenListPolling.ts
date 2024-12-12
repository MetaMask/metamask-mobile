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
import {
  selectERC20TokensByChain,
  selectTokenList,
} from '../../../selectors/tokenListController';
import { PopularList } from '../../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkConfiguration } from '@metamask/network-controller';

const useTokenListPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

  // Selectors returning state updated by the polling
  const tokenList = useSelector(selectTokenList);
  const tokenListByChain = useSelector(selectERC20TokensByChain);

  // determine if the current chain is popular
  const isPopular = PopularList.some(
    (popular) =>
      popular.chainId === currentChainId ||
      currentChainId === CHAIN_IDS.MAINNET ||
      currentChainId === CHAIN_IDS.LINEA_MAINNET,
  );

  // filter out networks that are not popular, mainnet or linea mainnet
  const networkConfigurationsToPoll: NetworkConfiguration[] = Object.values(
    networkConfigurations,
  ).reduce((acc: NetworkConfiguration[], network) => {
    if (isPopular) {
      acc.push(network);
    }
    return acc;
  }, []);

  // if all networks are selected, poll all popular networks
  const filteredChainIds = isAllNetworksSelected
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
