import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import {
  selectConversionRate,
  selectCurrencyRates,
} from '../../../selectors/currencyRateController';
import { PopularList } from '../../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkConfiguration } from '@metamask/network-controller';

// Polls native currency prices across networks.
const useCurrencyRatePolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);

  const isPopular = PopularList.some(
    (popular) =>
      popular.chainId === currentChainId ||
      currentChainId === CHAIN_IDS.MAINNET ||
      currentChainId === CHAIN_IDS.LINEA_MAINNET,
  );

  const chainIdsToPoll: NetworkConfiguration[] = Object.values(
    networkConfigurations,
  ).reduce((acc: NetworkConfiguration[], network) => {
    if (
      isPopular ||
      network.chainId === CHAIN_IDS.MAINNET ||
      network.chainId === CHAIN_IDS.LINEA_MAINNET
    ) {
      acc.push(network);
    }
    return acc;
  }, []);

  // Selectors returning state updated by the polling
  const conversionRate = useSelector(selectConversionRate);
  const currencyRates = useSelector(selectCurrencyRates);

  const nativeCurrencies = isPopular
    ? [...new Set(chainIdsToPoll.map((n) => n.nativeCurrency))]
    : [networkConfigurations[currentChainId].nativeCurrency];

  const { CurrencyRateController } = Engine.context;

  usePolling({
    startPolling: CurrencyRateController.startPolling.bind(
      CurrencyRateController,
    ),
    stopPollingByPollingToken:
      CurrencyRateController.stopPollingByPollingToken.bind(
        CurrencyRateController,
      ),
    input: [{ nativeCurrencies }],
  });

  return {
    conversionRate,
    currencyRates,
  };
};

export default useCurrencyRatePolling;
