import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { Hex } from '@metamask/utils';
import { usePollingNetworks } from './use-polling-networks';

const useTokenBalancesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const pollingNetworks = usePollingNetworks();

  const pollingInput =
    pollingNetworks.length > 0
      ? [
          {
            chainIds: pollingNetworks.map((c) => c.chainId),
          },
        ]
      : [];

  let overridePollingInput: { chainIds: Hex[] }[] | undefined;
  if (chainIds) {
    // We don't want to take evmNetwork into account
    overridePollingInput = [
      {
        chainIds,
      },
    ];
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
