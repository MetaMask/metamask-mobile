import { Hex } from '@metamask/utils';
import { createDeepEqualSelector } from './util';
import { RootState } from '../reducers';
import { selectCurrentCurrency } from './currencyRateController';

/**
 * When loading the Asset view from a search, we add a property to the asset object
 * to indicate that it is from a search. This function checks for that property,
 * without any assumptions about the structure of the value it receives.
 *
 * This condition is used when displaying an asset, to determine where the information
 * about the asset should be loaded from.
 */
export const isAssetFromSearch = (asset: unknown) =>
  typeof asset === 'object' &&
  asset !== null &&
  'isFromSearch' in asset &&
  asset.isFromSearch === true;

// TODO Unified Assets Controller State Access (1)
// TokenSearchDiscoveryDataController: tokenDisplayData, swapsTokenAddressesByChainId
// References
// app/selectors/tokenSearchDiscoveryDataController.ts (3)
const selectTokenSearchDiscoveryDataControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenSearchDiscoveryDataController;

// TODO Unified Assets Controller State Access (1)
// TokenSearchDiscoveryDataController: tokenDisplayData
// References
// app/components/UI/AssetOverview/AssetOverview.tsx (1)
// app/components/UI/Bridge/components/TokenInsightsSheet/TokenInsightsSheet.tsx (1)
// app/components/UI/AssetOverview/TokenDetails/TokenDetails.tsx (1)
// app/components/Views/AssetLoader/index.tsx (1)
// app/components/UI/Earn/hooks/useEarnToken.ts (1)
export const selectTokenDisplayData = createDeepEqualSelector(
  selectTokenSearchDiscoveryDataControllerState,
  selectCurrentCurrency,
  (_state: RootState, chainId: Hex) => chainId,
  (_state: RootState, _chainId: Hex, address: string) => address,
  (state, currentCurrency, chainId, address) =>
    state?.tokenDisplayData.find(
      (d) =>
        d.chainId === chainId &&
        d.address === address &&
        d.currency === currentCurrency,
    ),
);

// TODO Unified Assets Controller State Access (1)
// TokenSearchDiscoveryDataController: swapsTokenAddressesByChainId
// References
// None found
export const selectSupportedSwapTokenAddressesByChainId =
  createDeepEqualSelector(
    selectTokenSearchDiscoveryDataControllerState,
    (state) => state?.swapsTokenAddressesByChainId,
  );

// TODO Unified Assets Controller State Access (1)
// TokenSearchDiscoveryDataController: swapsTokenAddressesByChainId
// References
// None found
export const selectSupportedSwapTokenAddressesForChainId =
  createDeepEqualSelector(
    selectTokenSearchDiscoveryDataControllerState,
    (_state: RootState, chainId: Hex) => chainId,
    (state, chainId) => state?.swapsTokenAddressesByChainId[chainId]?.addresses,
  );
