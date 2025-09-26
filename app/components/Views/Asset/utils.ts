///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF(keyring-snaps)
import { isAssetFromSearch } from '../../../selectors/tokenSearchDiscoveryDataController';

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
  // EVM Swaps
  let isEvmSwapsAssetAllowed;
  if (asset.isETH || asset.isNative) {
    isEvmSwapsAssetAllowed = true;
  } else if (isAssetFromSearch(asset)) {
    isEvmSwapsAssetAllowed = searchDiscoverySwapsTokens?.includes(
      asset.address?.toLowerCase(),
    );
  } else {
    isEvmSwapsAssetAllowed = asset.address?.toLowerCase() in swapsTokens;
  }
  let isSwapsAssetAllowed = isEvmSwapsAssetAllowed;

  // Solana Swaps
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (asset.chainId === SolScope.Mainnet) {
    isSwapsAssetAllowed = true;
  }
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)

  return isSwapsAssetAllowed;
};
