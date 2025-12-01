import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import { Hex } from '@metamask/utils';
import { usePollingNetworks } from './use-polling-networks';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';

const useTokenBalancesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  const pollingNetworks = usePollingNetworks();

  // Input to force polling to restart when selected account group changes
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);

  const pollingInput =
    pollingNetworks.length > 0
      ? [
          {
            chainIds: pollingNetworks.map((c) => c.chainId),
            selectedAccountGroupId,
          },
        ]
      : [];

  let overridePollingInput:
    | { chainIds: Hex[]; selectedAccountGroupId: string | null }[]
    | undefined;
  if (chainIds) {
    // We don't want to take evmNetwork into account
    overridePollingInput = [
      {
        chainIds,
        selectedAccountGroupId,
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
