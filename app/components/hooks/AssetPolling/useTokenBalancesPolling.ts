import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import usePolling from '../usePolling';
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { Hex } from '@metamask/utils';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';

const useTokenBalancesPolling = () => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const allTokens = useSelector(selectAllTokens);
  const tokensBalances = useSelector(selectTokensBalances);

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const input = Object.values(networkConfigurations).map(
    ({ defaultRpcEndpointIndex, rpcEndpoints, chainId }) => {
      const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];
      const tokensPerAccount = selectedInternalAccountAddress
        ? {
            [selectedInternalAccountAddress]:
              allTokens?.[chainId]?.[selectedInternalAccountAddress]?.map(
                (token) => token.address as Hex,
              ) || [],
          }
        : {};

      return {
        networkClientId,
        tokensPerAccount,
      };
    },
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
