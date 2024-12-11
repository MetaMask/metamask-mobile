import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectChainIdsToPoll,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../selectors/tokenRatesController';
import { isPortfolioViewEnabled } from '../../../util/networks';

const useTokenRatesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectChainIdsToPoll);
  const currentChainId = useSelector(selectChainId);

  // Selectors returning state updated by the polling
  const contractExchangeRates = useSelector(selectContractExchangeRates);
  const tokenMarketData = useSelector(selectTokenMarketData);

  const chainIdsToPoll = isPortfolioViewEnabled()
    ? chainIds ?? networkConfigurations
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
