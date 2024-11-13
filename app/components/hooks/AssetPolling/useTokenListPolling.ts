import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import usePolling from '../usePolling';
import { selectTokenList } from '../../../selectors/tokenListController';

const useTokenListPolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const tokenList = useSelector(selectTokenList);

  const input = Object.values(networkConfigurations).map(({ chainId }) => ({
    chainId,
  }));

  const { TokenListController } = Engine.context;

  usePolling({
    startPolling: TokenListController.startPolling.bind(TokenListController),
    stopPollingByPollingToken:
      TokenListController.stopPollingByPollingToken.bind(TokenListController),
    input,
  });

  return {
    tokenList,
  };
};

export default useTokenListPolling;
