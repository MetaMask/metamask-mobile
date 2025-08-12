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
import {
  isPortfolioViewEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';

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
  const enabledEvmNetworks = useSelector(selectEVMEnabledNetworks);

  let networkConfigurationsToPoll: { nativeCurrency: string }[] = [];

  // if all networks are selected, poll all popular networks
  if (isPortfolioViewEnabled()) {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      // When global network selector is removed, use enabled EVM networks
      networkConfigurationsToPoll = (enabledEvmNetworks || [])
        .filter((network) => networkConfigurations[network]?.nativeCurrency)
        .map((network) => ({
          nativeCurrency: networkConfigurations[network].nativeCurrency,
        }));
    } else {
      networkConfigurationsToPoll =
        isAllNetworksSelected && isPopularNetwork
          ? Object.values(networkConfigurationsPopularNetworks).map(
              (network) => ({
                nativeCurrency: network.nativeCurrency,
              }),
            )
          : networkConfigurations[currentChainId]?.nativeCurrency
          ? [
              {
                nativeCurrency:
                  networkConfigurations[currentChainId].nativeCurrency,
              },
            ]
          : [];
    }
  } else {
    networkConfigurationsToPoll = networkConfigurations[currentChainId]
      ?.nativeCurrency
      ? [
          {
            nativeCurrency:
              networkConfigurations[currentChainId].nativeCurrency,
          },
        ]
      : [];
  }

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
    providedChainIdsNativeCurrencies = chainIds
      .map((chainId) => {
        const networkConfiguration = networkConfigurations[chainId];
        const nativeCurrency = networkConfiguration?.nativeCurrency;

        return nativeCurrency
          ? { nativeCurrencies: [nativeCurrency] }
          : undefined;
      })
      .filter(Boolean) as { nativeCurrencies: string[] }[];
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
    input,
  });
};

export default useCurrencyRatePolling;
