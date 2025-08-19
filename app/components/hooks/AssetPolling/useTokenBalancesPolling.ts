import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { Hex } from '@metamask/utils';
import { usePollingNetworks } from './use-polling-networks';

const useTokenBalancesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const pollingNetworks = usePollingNetworks();
  const pollingInput = pollingNetworks.map((c) => ({ chainId: c.chainId }));

  let overridePollingInput: { chainId: Hex }[] | undefined;
  if (chainIds) {
    overridePollingInput = chainIds.map((chainId) => ({ chainId }));
  }

  const { TokenBalancesController } = Engine.context;

  const input = overridePollingInput ?? pollingInput;

  usePolling({
    startPolling: TokenBalancesController.startPolling.bind(
      TokenBalancesController,
    ),
    stopPollingByPollingToken:
      TokenBalancesController.stopPollingByPollingToken.bind(
        TokenBalancesController,
      ),
    input,
  });
};

export default useTokenBalancesPolling;
