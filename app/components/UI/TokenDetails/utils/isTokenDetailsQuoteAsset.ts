import type { QuoteTokensResponse } from '@metamask/social-controllers';
import { parseCaipAssetType, type CaipAssetType } from '@metamask/utils';

const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';

const normalize = (assetId: string): string =>
  assetId.startsWith('eip155:') ? assetId.toLowerCase() : assetId;

/** Checks the current query response rather than the post-trade matcher's global cache. */
export const isTokenDetailsQuoteAsset = (
  assetId: CaipAssetType,
  { natives, stablecoins }: QuoteTokensResponse,
): boolean => {
  const { chainId, chain, assetNamespace, assetReference } =
    parseCaipAssetType(assetId);
  const normalizedId = normalize(assetId);
  const matches = (quoteId: string): boolean =>
    normalize(quoteId) === normalizedId;
  const nativeAlias =
    assetNamespace === 'slip44' ||
    (chain.namespace === 'solana' && assetReference === WRAPPED_SOL_MINT);

  return (
    natives.some(
      (quoteId) =>
        matches(quoteId) ||
        (nativeAlias && normalize(quoteId).startsWith(`${chainId}/slip44:`)),
    ) || stablecoins.some(matches)
  );
};
