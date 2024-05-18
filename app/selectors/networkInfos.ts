import { createSelector } from 'reselect';
import { ProviderConfig } from '@metamask/network-controller';
import { getNetworkNameFromProviderConfig } from '../util/networks';
import { selectProviderConfig } from './networkController';
import { getNetworkImageSource } from '../util/networks';

export const selectNetworkName = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) =>
    getNetworkNameFromProviderConfig(providerConfig),
);

export const selectNetworkImageSource = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) =>
    getNetworkImageSource({
      networkType: providerConfig.type,
      chainId: providerConfig.chainId,
    }),
);
