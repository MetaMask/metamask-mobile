import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import {
  selectChainId,
  selectIsAllNetworks,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import {
  selectConversionRate,
  selectCurrencyRates,
} from '../../../selectors/currencyRateController';
import { getNetworkConfigurationsToPoll } from './utils';
import { isTestNet } from '../../../util/networks';

// Polls native currency prices across networks.
const useCurrencyRatePolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

  const networkConfigurationsPopular = getNetworkConfigurationsToPoll(
    networkConfigurations,
    currentChainId,
    isAllNetworksSelected,
  );

  // Selectors returning state updated by the polling
  const conversionRate = useSelector(selectConversionRate);
  const currencyRates = useSelector(selectCurrencyRates);

  // if all networks are selected, poll all popular networks
  const networkConfigurationsToPoll =
    isAllNetworksSelected && !isTestNet(currentChainId)
      ? networkConfigurationsPopular
      : [
          {
            nativeCurrency:
              networkConfigurations[currentChainId].nativeCurrency,
          },
        ];

  // get all native currencies to poll
  const nativeCurrencies = [
    ...new Set(networkConfigurationsToPoll.map((n) => n.nativeCurrency)),
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
