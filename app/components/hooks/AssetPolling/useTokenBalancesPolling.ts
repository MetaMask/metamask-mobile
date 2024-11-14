import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import usePolling from '../usePolling';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';

const useTokenBalancesPolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const tokensBalances = useSelector(selectTokensBalances);

  const input = Object.values(networkConfigurations).map(({ chainId }) => ({
    chainId,
  }));

  const { TokenBalancesController } = Engine.context;

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

  return {
    tokensBalances,
  };
};

export default useTokenBalancesPolling;
