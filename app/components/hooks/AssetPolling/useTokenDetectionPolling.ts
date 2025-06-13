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
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

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

  // if all networks are selected, poll all popular networks
  const filteredChainIds =
    isAllNetworksSelected && isPopularNetwork && isPortfolioViewEnabled()
      ? Object.values(networkConfigurationsPopularNetworks).map(
          (network) => network.chainId,
        )
      : [currentChainId];

  // if portfolio view is enabled, poll all chain ids
  const chainIdsToPoll =
    useTokenDetection && isEvmSelected
      ? [
          {
            chainIds: filteredChainIds as Hex[],
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
            chainIds: chainIds as Hex[],
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
