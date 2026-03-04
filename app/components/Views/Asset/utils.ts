///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps,tron)
import { SolScope, TrxScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF(keyring-snaps,tron)

export const getIsSwapsAssetAllowed = ({
  asset,
}: {
  asset: {
    isETH: boolean;
    isNative: boolean;
    address: string;
    chainId: string;
    isFromSearch?: boolean;
  };
}) => {
  // Keep swap entry points visible for all assets.
  // Unsupported source chains fall back to ETH mainnet in useSwapBridgeNavigation.
  let isSwapsAssetAllowed = true;

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
