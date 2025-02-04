import { createSelector } from 'reselect';
import {
  getNetworkNameFromProviderConfig,
  getNetworkImageSource,
} from '../util/networks';
import { ProviderConfig, selectProviderConfig } from './networkController';
import {
  selectNonEvmSelected,
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
  selectNonEvmSelected,
  selectSelectedNonEvmNetworkName,
  (
    providerConfig: ProviderConfig,
    isNonEvmNetworkSelected: boolean,
    nonEvmNetworkName: string,
  ) =>
    isNonEvmNetworkSelected
      ? nonEvmNetworkName
      : getNetworkNameFromProviderConfig(providerConfig),
);

export const selectNetworkImageSource = createSelector(
  selectProviderConfig,
  selectNonEvmSelected,
  selectSelectedNonEvmNetworkChainId,
  (
    providerConfig: ProviderConfig,
    isNonEvmNetworkSelected: boolean,
    nonEvmNetworkChainId: string,
  ) =>
    isNonEvmNetworkSelected
      ? getNonEvmNetworkImageSourceByChainId(nonEvmNetworkChainId)
      : getNetworkImageSource({
          networkType: providerConfig?.type,
          chainId: providerConfig.chainId,
        }),
);
