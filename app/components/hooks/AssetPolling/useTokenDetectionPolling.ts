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
import { PopularList } from '../../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkConfiguration } from '@metamask/network-controller';

const useTokenDetectionPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const useTokenDetection = useSelector(selectUseTokenDetection);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

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
    if (
      isPopular ||
      network.chainId === CHAIN_IDS.MAINNET ||
      network.chainId === CHAIN_IDS.LINEA_MAINNET ||
      isAllNetworksSelected
    ) {
      acc.push(network);
    }
    return acc;
  }, []);

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
