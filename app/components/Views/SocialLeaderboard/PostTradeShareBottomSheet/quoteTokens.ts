import {
  getNativeAssetForChainId,
  isNativeAddress,
} from '@metamask/bridge-controller';
import type { QuoteTokensResponse } from '@metamask/social-controllers';
import { isCaipAssetType, type CaipChainId } from '@metamask/utils';
import ReactQueryService from '../../../../core/ReactQueryService';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';

export const QUOTE_TOKENS_QUERY_KEY = [
  'SocialService:fetchQuoteTokens',
] as const;

// social-api lists wrapped SOL under the Solana native asset id.
const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';

const normalizeAssetId = (assetId: string): string =>
  assetId.startsWith('eip155:') ? assetId.toLowerCase() : assetId;

/**
 * Builds the CAIP-19 id social-api uses for a position token.
 *
 * @param tokenAddress - Position token address or CAIP-19 id.
 * @param chain - CAIP-2 chain of the position token.
 * @returns The CAIP-19 id, or `undefined` when it cannot be built.
 */
export const toPositionAssetId = (
  tokenAddress: string,
  chain: CaipChainId,
): string | undefined => {
  const isNative =
    !isCaipAssetType(tokenAddress) &&
    (isNativeAddress(tokenAddress) || tokenAddress === WRAPPED_SOL_MINT);
  if (isNative) {
    try {
      return getNativeAssetForChainId(chain).assetId;
    } catch {
      return undefined;
    }
  }
  return toAssetId(tokenAddress, chain);
};

/**
 * Returns whether the cached quote-token list marks the position token as one
 * social-api never builds a position for. Returns `false` while the list is
 * not loaded.
 *
 * @param tokenAddress - Position token address or CAIP-19 id.
 * @param chain - CAIP-2 chain of the position token.
 * @returns Whether post-trade sharing must be skipped for this token.
 */
export const isUnsupportedPostTradeAsset = (
  tokenAddress: string,
  chain: CaipChainId,
): boolean => {
  const quoteTokens =
    ReactQueryService.queryClient.getQueryData<QuoteTokensResponse>(
      QUOTE_TOKENS_QUERY_KEY,
    );
  const assetId = toPositionAssetId(tokenAddress, chain);
  if (!quoteTokens || !assetId) {
    return false;
  }
  const normalizedAssetId = normalizeAssetId(assetId);
  return [...quoteTokens.natives, ...quoteTokens.stablecoins].some(
    (quoteTokenAssetId) =>
      normalizeAssetId(quoteTokenAssetId) === normalizedAssetId,
  );
};
