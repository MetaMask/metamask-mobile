import { isNativeAddress, isSolanaChainId } from '@metamask/bridge-controller';
import type { QuoteTokensResponse } from '@metamask/social-controllers';
import {
  isCaipAssetType,
  parseCaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import ReactQueryService from '../../../../core/ReactQueryService';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';

export const QUOTE_TOKENS_QUERY_KEY = [
  'SocialService:fetchQuoteTokens',
] as const;

// social-api lists wrapped SOL under the Solana native asset id.
const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112';
// social-api stores Solana addresses with this prefix and may return it.
const SOLANA_ADDRESS_PREFIX = 'solana:';

interface PositionAsset {
  chain: CaipChainId;
  isNative: boolean;
  assetId?: string;
}

const normalizeAssetId = (assetId: string): string =>
  assetId.startsWith('eip155:') ? assetId.toLowerCase() : assetId;

const isNativeReference = (reference: string, chain: CaipChainId): boolean =>
  isNativeAddress(reference) ||
  (isSolanaChainId(chain) && reference === WRAPPED_SOL_MINT);

const toPositionAsset = (
  tokenAddress: string,
  chain: CaipChainId,
): PositionAsset => {
  const address = tokenAddress.trim();
  if (isCaipAssetType(address)) {
    const { chainId, assetNamespace, assetReference } =
      parseCaipAssetType(address);
    return {
      chain: chainId,
      isNative:
        assetNamespace === 'slip44' ||
        isNativeReference(assetReference, chainId),
      assetId: address,
    };
  }
  const reference =
    isSolanaChainId(chain) && address.startsWith(SOLANA_ADDRESS_PREFIX)
      ? address.slice(SOLANA_ADDRESS_PREFIX.length)
      : address;
  return {
    chain,
    isNative: isNativeReference(reference, chain),
    assetId: toAssetId(reference, chain),
  };
};

/**
 * Returns whether the cached quote-token list marks the position token as one
 * social-api never builds a position for. Returns `false` while the list is
 * not loaded.
 *
 * Natives match any `slip44` entry on the same chain, since social-api does not
 * always use the coin type MetaMask uses (e.g. HyperEVM).
 *
 * @param tokenAddress - Position token address or CAIP-19 id.
 * @param chain - CAIP-2 chain of the position token, used when `tokenAddress`
 * is not a CAIP-19 id.
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
  if (!quoteTokens) {
    return false;
  }
  const asset = toPositionAsset(tokenAddress, chain);
  if (asset.isNative) {
    const nativePrefix = `${normalizeAssetId(asset.chain)}/slip44:`;
    return quoteTokens.natives.some((nativeAssetId) =>
      normalizeAssetId(nativeAssetId).startsWith(nativePrefix),
    );
  }
  if (!asset.assetId) {
    return false;
  }
  const normalizedAssetId = normalizeAssetId(asset.assetId);
  return [...quoteTokens.natives, ...quoteTokens.stablecoins].some(
    (quoteTokenAssetId) =>
      normalizeAssetId(quoteTokenAssetId) === normalizedAssetId,
  );
};
