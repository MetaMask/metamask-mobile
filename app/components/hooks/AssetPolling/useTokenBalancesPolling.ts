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
import {
  isPortfolioViewEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';

const useTokenBalancesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const currentChainId = useSelector(selectEvmChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const enabledEvmNetworks = useSelector(selectEVMEnabledNetworks);

  let networkConfigurationsToPoll: Hex[] = [];

  if (isPortfolioViewEnabled()) {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      // When global network selector is removed, use enabled EVM networks
      networkConfigurationsToPoll = enabledEvmNetworks;
    } else {
      // When global network selector is enabled, use popular networks or current chain
      networkConfigurationsToPoll =
        isAllNetworksSelected && isPopularNetwork
          ? Object.values(networkConfigurationsPopularNetworks).map(
              (network) => network.chainId,
            )
          : [currentChainId];
    }
  } else {
    // Portfolio view is disabled, use current chain only
    networkConfigurationsToPoll = [currentChainId];
  }

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
    input,
  });
};

export default useTokenBalancesPolling;
