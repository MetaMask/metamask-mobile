///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps,tron)
import { SolScope, TrxScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF(keyring-snaps,tron)
import { isAssetFromSearch } from '../../../../../selectors/tokenSearchDiscoveryDataController';
import { isBridgeAllowed } from '../../../Bridge/utils';

export const getIsSwapsAssetAllowed = ({
  asset,
  searchDiscoverySwapsTokens,
}: {
  asset: {
    isETH: boolean;
    isNative: boolean;
    address: string;
    chainId: string;
    isFromSearch?: boolean;
  };
  searchDiscoverySwapsTokens: string[];
}) => {
  let isSwapsAssetAllowed;
  if (asset.isETH || asset.isNative) {
    const isChainAllowed = isBridgeAllowed(asset.chainId);
    isSwapsAssetAllowed = isChainAllowed;
  } else if (isAssetFromSearch(asset)) {
    isSwapsAssetAllowed = searchDiscoverySwapsTokens?.includes(
      asset.address?.toLowerCase(),
    );
  } else {
    // show Swaps CTA for EVM assets as tokens on Trending list will not be in SwapsController.swapsTokens
    isSwapsAssetAllowed = true;
  }

  // Solana Swaps
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (asset.chainId === SolScope.Mainnet) {
    isSwapsAssetAllowed = true;
  }
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  // Tron Swaps
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (asset.chainId === TrxScope.Mainnet) {
    isSwapsAssetAllowed = true;
  }
  ///: END:ONLY_INCLUDE_IF(tron)

  return isSwapsAssetAllowed;
};
