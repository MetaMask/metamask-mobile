import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import {
  selectConversionRate,
  selectConversionRateFoAllChains,
} from '../../../selectors/currencyRateController';

// Polls native currency prices across networks.
const useCurrencyRatePolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const filteredNetworkConfigurations = Object.values(
    networkConfigurations,
  ).filter(
    (networkConfiguration) =>
      !['0x5', '0xe704'].includes(networkConfiguration.chainId),
  );

  // Selectors returning state updated by the polling
  const conversionRate = useSelector(selectConversionRate);
  const currencyRates = useSelector(selectConversionRateFoAllChains);

  const nativeCurrencies = [
    ...new Set(
      Object.values(filteredNetworkConfigurations).map((n) => n.nativeCurrency),
    ),
  ];

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
