import { createSelector } from 'reselect';
import { CaipChainId, Hex } from '@metamask/utils';
import { RootState } from '../reducers';
import {
  getNetworkNameFromProviderConfig,
  getNetworkImageSource,
} from '../util/networks';
import {
  ProviderConfig,
  selectProviderConfig,
  selectEvmNetworkConfigurationsByChainId,
} from './networkController';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkName,
} from './multichainNetworkController';
import { getNonEvmNetworkImageSourceByChainId } from '../util/networks/customNetworks';

export const selectEvmNetworkName = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) =>
    getNetworkNameFromProviderConfig(providerConfig),
);

export const selectEvmNetworkImageSource = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) =>
    getNetworkImageSource({
      networkType: providerConfig?.type,
      chainId: providerConfig.chainId,
    }),
);
export const selectNetworkName = createSelector(
  selectProviderConfig,
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkName,
  (
    providerConfig: ProviderConfig,
    isEvmSelected: boolean,
    nonEvmNetworkName: string,
  ) =>
    !isEvmSelected
      ? nonEvmNetworkName
      : getNetworkNameFromProviderConfig(providerConfig),
);

export const selectNetworkImageSource = createSelector(
  selectProviderConfig,
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  (
    providerConfig: ProviderConfig,
    isEvmSelected: boolean,
    nonEvmNetworkChainId: CaipChainId,
  ) =>
    !isEvmSelected
      ? getNonEvmNetworkImageSourceByChainId(nonEvmNetworkChainId)
      : getNetworkImageSource({
          networkType: providerConfig?.type,
          chainId: providerConfig.chainId,
        }),
);

export const selectNetworkImageSourceByChainId = createSelector(
  [
    selectIsEvmNetworkSelected,
    selectSelectedNonEvmNetworkChainId,
    selectEvmNetworkConfigurationsByChainId,
    (_state: RootState, chainId: string) => chainId,
  ],
  (
    isEvmSelected: boolean,
    nonEvmNetworkChainId: CaipChainId,
    networkConfigurations,
    chainId: string,
  ) => {
    if (!isEvmSelected) {
      return getNonEvmNetworkImageSourceByChainId(nonEvmNetworkChainId);
    }

    const networkConfiguration = networkConfigurations[chainId as Hex];
    return getNetworkImageSource({
      networkType: networkConfiguration?.rpcEndpoints?.[0]?.type || 'custom',
      chainId,
    });
  },
);
