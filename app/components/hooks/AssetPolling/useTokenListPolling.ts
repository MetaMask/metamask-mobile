import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { Hex } from '@metamask/utils';
import { usePollingNetworks } from './use-polling-networks';

const useTokenListPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const pollingNetworks = usePollingNetworks();
  const pollingInput = pollingNetworks.map((c) => ({ chainId: c.chainId }));

  let overridePollingInput: { chainId: Hex }[] | undefined;
  if (chainIds) {
    overridePollingInput = chainIds.map((chainId) => ({ chainId }));
  }

  const { TokenListController } = Engine.context;

  const input = overridePollingInput ?? pollingInput;

  usePolling({
    startPolling: TokenListController.startPolling.bind(TokenListController),
    stopPollingByPollingToken:
      TokenListController.stopPollingByPollingToken.bind(TokenListController),
    input,
  });
};

export default useTokenListPolling;
