import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectAllPopularNetworkConfigurations,
  selectEvmChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled } from '../../../util/networks';
<<<<<<< HEAD
=======
import { selectAllTokenBalances } from '../../../selectors/tokenBalancesController';
>>>>>>> stable
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

const useTokenBalancesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const currentChainId = useSelector(selectEvmChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
<<<<<<< HEAD
=======

  // Selectors returning state updated by the polling
  const tokenBalances = useSelector(selectAllTokenBalances);
>>>>>>> stable

  const networkConfigurationsToPoll =
    isAllNetworksSelected && isPopularNetwork && isPortfolioViewEnabled()
      ? Object.values(networkConfigurationsPopularNetworks).map(
          (network) => network.chainId,
        )
      : [currentChainId];

  const chainIdsToPoll = isEvmSelected
    ? networkConfigurationsToPoll.map((chainId) => ({
        chainId: chainId as Hex,
      }))
    : [];

  const { TokenBalancesController } = Engine.context;

  let providedChainIds;
  if (chainIds) {
    providedChainIds = chainIds.map((chainId) => ({ chainId: chainId as Hex }));
  }

  const input = providedChainIds ?? chainIdsToPoll;

  usePolling({
    startPolling: TokenBalancesController.startPolling.bind(
      TokenBalancesController,
    ),
    stopPollingByPollingToken:
      TokenBalancesController.stopPollingByPollingToken.bind(
        TokenBalancesController,
      ),
<<<<<<< HEAD
    input,
=======
    input: isEvmSelected
      ? chainIdsToPoll.map((chainId) => ({ chainId: chainId as Hex }))
      : [],
>>>>>>> stable
  });
};

export default useTokenBalancesPolling;
