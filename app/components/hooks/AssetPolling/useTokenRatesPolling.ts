import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { Hex } from '@metamask/utils';
import { usePollingNetworks } from './use-polling-networks';

const useTokenRatesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const pollingNetworks = usePollingNetworks();
  const pollingInput =
    pollingNetworks.length > 0
      ? [{ chainIds: pollingNetworks.map((c) => c.chainId) }]
      : [];

  let overridePollingInput: [{ chainIds: Hex[] }] | undefined;
  if (chainIds) {
    overridePollingInput = [{ chainIds }];
  }

  const { TokenRatesController } = Engine.context;

  const input = overridePollingInput ?? pollingInput;

  usePolling({
    startPolling: TokenRatesController.startPolling.bind(TokenRatesController),
    stopPollingByPollingToken:
      TokenRatesController.stopPollingByPollingToken.bind(TokenRatesController),
    input,
  });
};

export default useTokenRatesPolling;
