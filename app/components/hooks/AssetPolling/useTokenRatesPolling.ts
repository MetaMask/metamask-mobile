import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectIsAllNetworks,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../selectors/tokenRatesController';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { getNetworkConfigurationsToPoll } from './utils';

const useTokenRatesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

  // Selectors returning state updated by the polling
  const contractExchangeRates = useSelector(selectContractExchangeRates);
  const tokenMarketData = useSelector(selectTokenMarketData);

  const networkConfigurationsToPoll = getNetworkConfigurationsToPoll(
    networkConfigurations,
    currentChainId,
    isAllNetworksSelected,
  );

  // if all networks are selected, poll all popular networks
  const filteredChainIds = isAllNetworksSelected
    ? networkConfigurationsToPoll.map((network) => network.chainId)
    : [currentChainId];

  const chainIdsToPoll = isPortfolioViewEnabled()
    ? chainIds ?? filteredChainIds
    : [currentChainId];

  const { TokenRatesController } = Engine.context;

  usePolling({
    startPolling: TokenRatesController.startPolling.bind(TokenRatesController),
    stopPollingByPollingToken:
      TokenRatesController.stopPollingByPollingToken.bind(TokenRatesController),
    input: chainIdsToPoll.map((chainId) => ({ chainId: chainId as Hex })),
  });

  return {
    contractExchangeRates,
    tokenMarketData,
  };
};

export default useTokenRatesPolling;
