import type { AssetsControllerState } from '@metamask/assets-controller';

function isStellarClassicAssetId(assetId: string): boolean {
  return assetId.startsWith('stellar:') && assetId.includes('/asset:');
}

function getStellarClassicTrustlineLimit(
  accountId: string,
  assetId: string,
  assetsBalance: AssetsControllerState['assetsBalance'],
): number | undefined {
  const balanceRow = assetsBalance[accountId]?.[assetId];
  if (
    !balanceRow ||
    typeof balanceRow !== 'object' ||
    !('accountAssetInfo' in balanceRow)
  ) {
    return undefined;
  }

  const { accountAssetInfo } = balanceRow as {
    accountAssetInfo?: { limit?: string };
  };
  if (!accountAssetInfo || typeof accountAssetInfo.limit !== 'string') {
    return undefined;
  }

  const parsedLimit = Number.parseFloat(accountAssetInfo.limit);
  return Number.isNaN(parsedLimit) ? undefined : parsedLimit;
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

  if (isStellarClassicAssetId(assetId)) {
    const limit = getStellarClassicTrustlineLimit(
      accountId,
      assetId,
      assetsBalance,
    );
    // A known limit reflects current trustline status and overrides custom
    // import status: a closed/deactivated trustline must hide the asset even
    // if it was previously imported.
    if (limit !== undefined) {
      return limit > 0;
    }
  }

  if (customAssets[accountId]?.includes(assetId)) {
    return true;
  }

  return false;
}
