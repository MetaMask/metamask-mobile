export const getIsSwapsAssetAllowed = ({
  asset: _asset,
}: {
  asset: {
    isETH: boolean;
    isNative: boolean;
    address: string;
    chainId: string;
    isFromSearch?: boolean;
  };
}) =>
  // Keep swap entry points visible for all assets.
  // Unsupported source chains fall back to ETH mainnet in useSwapBridgeNavigation.
  true;
