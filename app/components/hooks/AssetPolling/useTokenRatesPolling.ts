import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import usePolling from '../usePolling';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';

const useTokenRatesPolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const contractExchangeRates = useSelector(selectContractExchangeRates);

  const input = Object.values(networkConfigurations).map(({ chainId }) => ({
    chainId,
  }));

  const { TokenRatesController } = Engine.context;

  usePolling({
    startPolling: TokenRatesController.startPolling.bind(TokenRatesController),
    stopPollingByPollingToken:
      TokenRatesController.stopPollingByPollingToken.bind(TokenRatesController),
    input,
  });

  return {
    contractExchangeRates,
  };
};

export default useTokenRatesPolling;
