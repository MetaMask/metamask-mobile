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
import { PopularList } from '../../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkConfiguration } from '@metamask/network-controller';

// Polls native currency prices across networks.
const useCurrencyRatePolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

  // determine if the current chain is popular
  const isPopular = PopularList.some(
    (popular) =>
      popular.chainId === currentChainId ||
      currentChainId === CHAIN_IDS.MAINNET ||
      currentChainId === CHAIN_IDS.LINEA_MAINNET,
  );

  // filter out networks that are not popular, mainnet or linea mainnet
  const networkConfigurationsPopular: NetworkConfiguration[] = Object.values(
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

  // Selectors returning state updated by the polling
  const conversionRate = useSelector(selectConversionRate);
  const currencyRates = useSelector(selectCurrencyRates);

  // if all networks are selected, poll all popular networks
  const networkConfigurationsToPoll = isAllNetworksSelected
    ? networkConfigurationsPopular
    : [
        {
          nativeCurrency: networkConfigurations[currentChainId].nativeCurrency,
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
