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

const useTokenListPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const currentChainId = useSelector(selectEvmChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const enabledEvmNetworks = useSelector(selectEVMEnabledNetworks);

  let filteredChainIds: Hex[] = [];

  if (isPortfolioViewEnabled()) {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      // When global network selector is removed, use enabled EVM networks
      filteredChainIds = enabledEvmNetworks;
    } else {
      // When global network selector is enabled, use popular networks or current chain
      filteredChainIds =
        isAllNetworksSelected && isPopularNetwork
          ? Object.values(networkConfigurationsPopularNetworks).map(
              (network) => network.chainId,
            )
          : [currentChainId];
    }
  } else {
    // Portfolio view is disabled, use current chain only
    filteredChainIds = [currentChainId];
  }

  const chainIdsToPoll = isEvmSelected
    ? filteredChainIds.map((chainId) => ({ chainId: chainId as Hex }))
    : [];

  const { TokenListController } = Engine.context;

  let providedChainIds;
  if (chainIds) {
    providedChainIds = chainIds.map((chainId) => ({ chainId: chainId as Hex }));
  }

  const input = providedChainIds ?? chainIdsToPoll;

  usePolling({
    startPolling: TokenListController.startPolling.bind(TokenListController),
    stopPollingByPollingToken:
      TokenListController.stopPollingByPollingToken.bind(TokenListController),
    input,
  });
};

export default useTokenListPolling;
