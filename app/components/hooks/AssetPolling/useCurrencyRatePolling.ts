import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import usePolling from '../usePolling';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import { usePollingNetworks } from './use-polling-networks';

// Polls native currency prices across networks.
const useCurrencyRatePolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const pollingNetworks = usePollingNetworks();
  const pollingInput =
    pollingNetworks.length > 0
      ? [
          {
            nativeCurrencies: [
              ...new Set(pollingNetworks.map((c) => c.nativeCurrency)),
            ],
          },
        ]
      : [];

  let overridePollingInput: { nativeCurrencies: string[] }[] | undefined;
  if (chainIds) {
    const nativeCurrencies = [
      ...new Set(
        chainIds
          .map((chainId) => {
            const networkConfiguration = networkConfigurations[chainId];
            const nativeCurrency = networkConfiguration?.nativeCurrency;
            return nativeCurrency;
          })
          .filter((c): c is NonNullable<typeof c> => Boolean(c)),
      ),
    ];

    overridePollingInput = [{ nativeCurrencies }];
  }

  const { CurrencyRateController } = Engine.context;

  const input = overridePollingInput ?? pollingInput;

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
