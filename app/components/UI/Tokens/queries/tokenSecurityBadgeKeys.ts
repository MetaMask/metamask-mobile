import type { CaipAssetType } from '@metamask/utils';

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
  byAsset: (caipAssetId: CaipAssetType) =>
    [...tokenListSecurityBadgeKeys.all(), caipAssetId] as const,
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
