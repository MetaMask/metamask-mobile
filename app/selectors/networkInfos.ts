import { createSelector } from 'reselect';
import {
  getNetworkNameFromProviderConfig,
  getNetworkImageSource,
} from '../util/networks';
import { ProviderConfig, selectProviderConfig } from './networkController';

export const selectNetworkName = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => {
    console.log('providerConfig +++++', providerConfig);
    return getNetworkNameFromProviderConfig(providerConfig);
  },
);

export const selectNetworkImageSource = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) =>
    getNetworkImageSource({
      networkType: providerConfig?.type,
      chainId: providerConfig.chainId,
    }),
);
