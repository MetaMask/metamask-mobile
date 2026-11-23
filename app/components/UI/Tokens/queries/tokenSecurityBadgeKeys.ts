import type { CaipAssetType } from '@metamask/utils';

import { normalizeCaipAssetIdForTokenApi } from '../util/tokenSecurityBadgeBatch';

export interface TokenListSecurityBadgeCaipFromTokenKeyInput {
  chainId: string | undefined;
  address: string | undefined;
  isNative: boolean | undefined;
  isETH: boolean | undefined;
}

/**
 * Query key factory for token list security badges (TanStack Query).
 */
export const tokenListSecurityBadgeKeys = {
  all: () => ['tokenList', 'securityBadge'] as const,
  /**
   * Normalized so callers that disagree on ERC-20 address casing still resolve
   * one entry: the token list checksums the address before building its asset
   * id, while Token Details passes `token.address` through as-is. Without this
   * the same token would occupy two entries and fetch twice.
   */
  byAsset: (caipAssetId: CaipAssetType) =>
    [
      ...tokenListSecurityBadgeKeys.all(),
      normalizeCaipAssetIdForTokenApi(caipAssetId),
    ] as const,
  caipFromToken: (input: TokenListSecurityBadgeCaipFromTokenKeyInput) =>
    [
      ...tokenListSecurityBadgeKeys.all(),
      'caipFromToken',
      input.chainId,
      input.address,
      input.isNative,
      input.isETH,
    ] as const,
};
