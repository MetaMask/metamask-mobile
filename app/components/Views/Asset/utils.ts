///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF(keyring-snaps)
import { isAssetFromSearch } from '../../../selectors/tokenSearchDiscoveryDataController';
import { isSwapsAllowed } from '../../UI/Swaps/utils';

export const getIsSwapsAssetAllowed = ({
  asset,
  searchDiscoverySwapsTokens,
  swapsTokens,
}: {
  asset: {
    isETH: boolean;
    isNative: boolean;
    address: string;
    chainId: string;
    isFromSearch?: boolean;
  };
  searchDiscoverySwapsTokens: string[];
  swapsTokens: Record<string, unknown>;
}) => {
  let isSwapsAssetAllowed;
  if (asset.isETH || asset.isNative) {
    const isChainAllowed = isSwapsAllowed(asset.chainId);
    isSwapsAssetAllowed = isChainAllowed;
  } else if (isAssetFromSearch(asset)) {
    isSwapsAssetAllowed = searchDiscoverySwapsTokens?.includes(
      asset.address?.toLowerCase(),
    );
  } else {
    isSwapsAssetAllowed = asset.address?.toLowerCase() in swapsTokens;
  }

  // Solana Swaps
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (asset.chainId === SolScope.Mainnet) {
    isSwapsAssetAllowed = true;
  }
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  return isSwapsAssetAllowed;
};
