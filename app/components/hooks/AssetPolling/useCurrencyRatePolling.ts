import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import usePolling from '../usePolling';
import {
  selectAllPopularNetworkConfigurations,
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

// Polls native currency prices across networks.
const useCurrencyRatePolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const currentChainId = useSelector(selectEvmChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
<<<<<<< HEAD
=======

  // Selectors returning state updated by the polling
  const conversionRate = useSelector(selectConversionRate);
  const currencyRates = useSelector(selectCurrencyRates);
>>>>>>> stable

  // if all networks are selected, poll all popular networks
  const networkConfigurationsToPoll =
    isAllNetworksSelected && isPopularNetwork && isPortfolioViewEnabled()
      ? Object.values(networkConfigurationsPopularNetworks).map((network) => ({
          nativeCurrency: network.nativeCurrency,
        }))
      : [
          {
            nativeCurrency:
              networkConfigurations[currentChainId].nativeCurrency,
          },
        ];

  // get all native currencies to poll
  const nativeCurrenciesToPoll = isEvmSelected
    ? [
        {
          nativeCurrencies: [
            ...new Set(
              networkConfigurationsToPoll.map((n) => n.nativeCurrency),
            ),
          ],
        },
      ]
    : [];

  const { CurrencyRateController } = Engine.context;

  let providedChainIdsNativeCurrencies;
  if (chainIds) {
    providedChainIdsNativeCurrencies = chainIds.map((chainId) => ({
      nativeCurrencies: [networkConfigurations[chainId].nativeCurrency],
    }));
  }

  const input = providedChainIdsNativeCurrencies ?? nativeCurrenciesToPoll;

  usePolling({
    startPolling: CurrencyRateController.startPolling.bind(
      CurrencyRateController,
    ),
    stopPollingByPollingToken:
      CurrencyRateController.stopPollingByPollingToken.bind(
        CurrencyRateController,
      ),
<<<<<<< HEAD
    input,
=======
    input: isEvmSelected ? [{ nativeCurrencies }] : [],
>>>>>>> stable
  });
};

export default useCurrencyRatePolling;
