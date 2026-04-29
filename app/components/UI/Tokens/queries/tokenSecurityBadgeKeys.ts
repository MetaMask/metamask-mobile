import type { CaipAssetType } from '@metamask/utils';

/**
 * Query key factory for token list security badges (TanStack Query).
 */
export const tokenListSecurityBadgeKeys = {
  all: () => ['tokenList', 'securityBadge'] as const,
  byAsset: (caipAssetId: CaipAssetType) =>
    [...tokenListSecurityBadgeKeys.all(), caipAssetId] as const,
};
