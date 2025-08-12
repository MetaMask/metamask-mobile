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
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';

const useTokenDetectionPolling = ({
  chainIds,
  address,
}: { chainIds?: Hex[]; address?: Hex } = {}) => {
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const currentChainId = useSelector(selectEvmChainId);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const useTokenDetection = useSelector(selectUseTokenDetection);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
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

  const chainIdsToPoll =
    useTokenDetection && isEvmSelected
      ? [
          {
            chainIds: filteredChainIds,
            address: selectedAccount?.address as Hex,
          },
        ]
      : [];

  const { TokenDetectionController } = Engine.context;

  let providedChainIdsAndAddress;

  if (chainIds && address) {
    // We don't want to take evmNetwork into account
    providedChainIdsAndAddress = useTokenDetection
      ? [
          {
            chainIds,
            address: address as Hex,
          },
        ]
      : [];
  }

  const input = providedChainIdsAndAddress ?? chainIdsToPoll;

  usePolling({
    startPolling: TokenDetectionController.startPolling.bind(
      TokenDetectionController,
    ),
    stopPollingByPollingToken:
      TokenDetectionController.stopPollingByPollingToken.bind(
        TokenDetectionController,
      ),
    input,
  });
};

export default useTokenDetectionPolling;
