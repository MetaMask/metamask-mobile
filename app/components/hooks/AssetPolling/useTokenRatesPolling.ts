import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../selectors/tokenRatesController';

const useTokenRatesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  // Selectors returning state updated by the polling
  const contractExchangeRates = useSelector(selectContractExchangeRates);
  const tokenMarketData = useSelector(selectTokenMarketData);

  const { TokenRatesController } = Engine.context;

  usePolling({
    startPolling: TokenRatesController.startPolling.bind(TokenRatesController),
    stopPollingByPollingToken:
      TokenRatesController.stopPollingByPollingToken.bind(TokenRatesController),
    input: (chainIds ?? Object.keys(networkConfigurations)).map((chainId) => ({
      chainId: chainId as Hex,
    })),
  });

  return {
    contractExchangeRates,
    tokenMarketData,
  };
};

export default useTokenRatesPolling;
