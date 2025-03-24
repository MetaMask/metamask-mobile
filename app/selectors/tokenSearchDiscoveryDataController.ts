import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { Hex } from '@metamask/utils';
import { selectCurrentCurrency } from './currencyRateController';

export const isAssetFromSearch = (asset: unknown) => typeof asset === 'object' && asset !== null && 'isFromSearch' in asset && asset.isFromSearch === true;

const selectTokenSearchDiscoveryDataControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenSearchDiscoveryDataController;

export const selectTokenDisplayData = createSelector(
  selectTokenSearchDiscoveryDataControllerState,
  selectCurrentCurrency,
  (_state: RootState, chainId: Hex) => chainId,
  (_state: RootState, _chainId: Hex, address: string) => address,
  (state, currentCurrency, chainId, address) => state?.tokenDisplayData.find(d => d.chainId === chainId && d.address === address && d.currency === currentCurrency)
);

export const selectSupportedSwapTokenAddressesByChainId = createSelector(
  selectTokenSearchDiscoveryDataControllerState,
  (state) => state?.swapsTokenAddressesByChainId,
);

export const selectSupportedSwapTokenAddressesForChainId = createSelector(
  selectTokenSearchDiscoveryDataControllerState,
  (_state: RootState, chainId: Hex) => chainId,
  (state, chainId) => state?.swapsTokenAddressesByChainId[chainId]?.addresses,
);
