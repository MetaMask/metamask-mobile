import { MultichainNetworkControllerState } from '@metamask/multichain-network-controller';
import { RootState } from '../../reducers';
import { createSelector } from 'reselect';
import { CaipChainId } from '@metamask/utils';
import { MULTICHAIN_PROVIDER_CONFIGS } from '../../core/Multichain/constants';

const getNonEvmNetworkSymbolByChainId = (chainId: CaipChainId) => {
  const network = MULTICHAIN_PROVIDER_CONFIGS[chainId];
  return network?.ticker;
};

export const selectMultichainNetworkControllerState = (state: RootState) =>
  state.engine.backgroundState?.MultichainNetworkController;

export const selectIsEvmNetworkSelected = createSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) =>
    multichainNetworkControllerState.isEvmSelected,
);

export const selectSelectedNonEvmNetworkChainId = createSelector(
  selectMultichainNetworkControllerState,
  (multichainNetworkControllerState: MultichainNetworkControllerState) =>
    multichainNetworkControllerState.selectedMultichainNetworkChainId,
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
    const network =
      nonEvmNetworkConfigurationsByChainId[selectedMultichainNetworkChainId];
    return network?.name;
  },
);

export const selectSelectedNonEvmNativeCurrency = createSelector(
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkChainId,
  (nonEvmNetworkConfigurationsByChainId, selectedMultichainNetworkChainId) => {
    const network =
      nonEvmNetworkConfigurationsByChainId[selectedMultichainNetworkChainId];
    return network?.nativeCurrency;
  },
);

export const selectSelectedNonEvmNetworkSymbol = createSelector(
  selectSelectedNonEvmNetworkChainId,
  (selectedMultichainNetworkChainId) =>
    getNonEvmNetworkSymbolByChainId(selectedMultichainNetworkChainId),
);
