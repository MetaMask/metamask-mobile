import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../selectors/tokenRatesController';
import { NetworkConfiguration } from '@metamask/network-controller';

const useTokenRatesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const filteredNetworkConfigurations = Object.values(networkConfigurations)
    .filter(
      (networkConfiguration) =>
        !['0x5', '0xe704'].includes(networkConfiguration.chainId),
    )
    .reduce((acc, networkConfiguration) => {
      acc[networkConfiguration.chainId] = networkConfiguration; // Keep chainId as key
      return acc;
    }, {} as Record<Hex, NetworkConfiguration>);

  // Selectors returning state updated by the polling
  const contractExchangeRates = useSelector(selectContractExchangeRates);
  const tokenMarketData = useSelector(selectTokenMarketData);

  const { TokenRatesController } = Engine.context;

  usePolling({
    startPolling: TokenRatesController.startPolling.bind(TokenRatesController),
    stopPollingByPollingToken:
      TokenRatesController.stopPollingByPollingToken.bind(TokenRatesController),
    input: (chainIds ?? Object.keys(filteredNetworkConfigurations)).map(
      (chainId) => ({
        chainId: chainId as Hex,
      }),
    ),
  });

  return {
    contractExchangeRates,
    tokenMarketData,
  };
};

export default useTokenRatesPolling;
