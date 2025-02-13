import { createSelector } from 'reselect';
import {
  getNetworkNameFromProviderConfig,
  getNetworkImageSource,
} from '../util/networks';
import { ProviderConfig, selectProviderConfig } from './networkController';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkName,
} from './multichainNetworkController';
import { getNonEvmNetworkImageSourceByChainId } from '../util/networks/customNetworks';
import { CaipChainId } from '@metamask/utils';

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
