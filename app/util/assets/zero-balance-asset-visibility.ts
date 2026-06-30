import type { AssetsControllerState } from '@metamask/assets-controller';

function isStellarClassicAssetId(assetId: string): boolean {
  return assetId.startsWith('stellar:') && assetId.includes('/asset:');
}

function hasStellarClassicTrustlineLimit(
  accountId: string,
  assetId: string,
  assetsBalance: AssetsControllerState['assetsBalance'],
): boolean {
  const balanceRow = assetsBalance[accountId]?.[assetId];
  if (
    !balanceRow ||
    typeof balanceRow !== 'object' ||
    !('accountAssetInfo' in balanceRow)
  ) {
    return false;
  }

  const { accountAssetInfo } = balanceRow as {
    accountAssetInfo?: { limit?: string };
  };
  if (!accountAssetInfo || typeof accountAssetInfo.limit !== 'string') {
    return false;
  }

  const parsedLimit = Number.parseFloat(accountAssetInfo.limit);
  return !Number.isNaN(parsedLimit) && parsedLimit > 0;
}

/**
 * Whether a zero-balance non-native asset should remain visible when
 * hideZeroBalanceTokens is enabled. Custom imports and Stellar classic assets
 * with an open trustline must stay visible for import/activate/remove UX.
 */
export function shouldRetainZeroBalanceNonNativeAsset(options: {
  accountId: string | undefined;
  assetId: string;
  customAssets: AssetsControllerState['customAssets'];
  assetsBalance: AssetsControllerState['assetsBalance'];
}): boolean {
  const { accountId, assetId, customAssets, assetsBalance } = options;

  if (!accountId) {
    return false;
  }

  if (customAssets[accountId]?.includes(assetId)) {
    return true;
  }

  if (
    isStellarClassicAssetId(assetId) &&
    hasStellarClassicTrustlineLimit(accountId, assetId, assetsBalance)
  ) {
    return true;
  }

  return false;
}
