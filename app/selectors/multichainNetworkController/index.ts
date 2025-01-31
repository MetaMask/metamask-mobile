import { MultichainNetworkControllerState } from '@metamask/multichain-network-controller';
import { RootState } from '../../reducers';
import { createSelector } from 'reselect';
import { isSolanaEnabled } from '../../util/networks';

export const selectMultichainNetworkControllerState = (state: RootState) =>
  state.engine.backgroundState?.MultichainNetworkController;

export const selectNonEvmSelected = createSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) =>
    isSolanaEnabled() ? multichainNetworkControllerState.nonEvmSelected : false,
);

export const selectSelectedNonEvmNetworkChainId = createSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) =>
    isSolanaEnabled()
      ? multichainNetworkControllerState.selectedMultichainNetworkChainId
      : '',
);

export const selectNonEvmNetworkConfigurationsByChainId = createSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) =>
    multichainNetworkControllerState.multichainNetworkConfigurationsByChainId,
);

export const selectSelectedNonEvmNetworkName = createSelector(
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkChainId,
  (
    nonEvmNetworkConfigurationsByChainId,
    selectedMultichainNetworkChainId: string,
  ) => {
    if (!isSolanaEnabled()) return '';
    const network =
      nonEvmNetworkConfigurationsByChainId[selectedMultichainNetworkChainId];
    return network?.name;
  },
);

export const selectNonEvmBlockExplorerUrl = createSelector(
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkChainId,
  (
    nonEvmNetworkConfigurationsByChainId,
    selectedMultichainNetworkChainId: string,
  ) => {
    const network =
      nonEvmNetworkConfigurationsByChainId[selectedMultichainNetworkChainId];
    // TODO: [SOLANA] Revisit this before shipping,show we return the first block explorer url?
    return network?.blockExplorerUrls[0];
  },
);
