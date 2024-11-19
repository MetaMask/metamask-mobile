import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import usePolling from '../usePolling';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';

const useTokenBalancesPolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const filteredNetworkConfigurations = Object.values(
    networkConfigurations,
  ).filter(
    (networkConfiguration) =>
      !['0x5', '0xe704'].includes(networkConfiguration.chainId),
  );

  const tokensBalances = useSelector(selectTokensBalances);

  const input = Object.values(filteredNetworkConfigurations).map(
    ({ chainId }) => ({
      chainId,
    }),
  );

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
