import {
  formatAddressToAssetId,
  formatChainIdToHex,
  isNativeAddress,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import {
  CaipChainId,
  Hex,
  isCaipAssetType,
  parseCaipAssetType,
} from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectIsBridgeEnabledSourceFactory } from '../../../../../../../core/redux/slices/bridge';
import { useAssetMetadata } from '../../../../../../UI/Bridge/hooks/useAssetMetadata';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { getNativeSourceToken } from '../../../../../../UI/Bridge/utils/tokenUtils';
import type { QuickBuyTarget } from '../types';

/**
 * Splits a CAIP-19 asset type (`<chainId>/<namespace>:<reference>`) into its
 * asset namespace and reference using `@metamask/utils`. Returns `undefined`
 * for bare addresses that aren't CAIP-wrapped, so callers can fall back to
 * the legacy path.
 */
const parseAssetType = (
  caipAssetId: string,
): { namespace: string; reference: string } | undefined => {
  if (!isCaipAssetType(caipAssetId)) return undefined;
  const { assetNamespace, assetReference } = parseCaipAssetType(caipAssetId);
  return { namespace: assetNamespace, reference: assetReference };
};

export interface QuickBuySetupResult {
  /** The destination chain ID (hex or CAIP) for this position's chain */
  chainId: Hex | CaipChainId | undefined;
  /** The destination token (what the user is buying) */
  destToken: BridgeToken | undefined;
  /** Whether token metadata is still loading */
  isLoading: boolean;
  /** Whether the chain is unsupported */
  isUnsupportedChain: boolean;
  /**
   * True when setup settled (chain supported, metadata no longer loading) but
   * no destination token could be resolved — e.g. the Token Metadata API had
   * no entry for the asset or the native-asset registry threw. Without
   * surfacing this, the sheet dead-ends with a permanently disabled Buy
   * button and no feedback.
   */
  isDestTokenUnavailable: boolean;
}

/**
 * Resolves a Position from the Social API into a destination BridgeToken
 * that can be used by the Bridge/Swaps system.
 *
 * Source token selection is handled separately by usePayWithTokens.
 */
export const useQuickBuySetup = (
  target: QuickBuyTarget | null,
): QuickBuySetupResult => {
  const position = target;
  const isBridgeEnabledSource = useSelector(selectIsBridgeEnabledSourceFactory);

  // Decode the CAIP-19 wrapper if present (Social feed always encodes this way
  // for non-EVM and may also do so for EVM). Native references (`slip44:NNN`)
  // are served from the chain's native asset registry. Token references
  // (`erc20`, `token`, `spl`, `trc20`, …) get their bare address forwarded to
  // `useAssetMetadata`. Bare hex/base58 addresses (legacy EVM shape) fall
  // through unchanged — except the EVM native sentinel (`0x0…0`), which Token
  // Details passes for natives like MON on Monad or HYPE on HyperEVM.
  const { metadataQuery, isNativeAsset, parsedTokenAddress } = useMemo(() => {
    const fallback = {
      metadataQuery: position?.tokenAddress ?? '',
      isNativeAsset: false,
      parsedTokenAddress: undefined as string | undefined,
    };
    if (!position?.tokenAddress) {
      return { ...fallback, metadataQuery: '' };
    }
    const parsed = parseAssetType(position.tokenAddress);
    if (!parsed) {
      if (isNativeAddress(position.tokenAddress)) {
        return {
          metadataQuery: '',
          isNativeAsset: true,
          parsedTokenAddress: undefined,
        };
      }
      return fallback;
    }
    if (parsed.namespace === 'slip44') {
      return {
        metadataQuery: '',
        isNativeAsset: true,
        parsedTokenAddress: undefined,
      };
    }
    return {
      metadataQuery: parsed.reference,
      isNativeAsset: false,
      parsedTokenAddress: parsed.reference,
    };
  }, [position?.tokenAddress]);

  // Destination chain from the target — hex for EVM, CAIP for non-EVM.
  const destChainId = useMemo(() => {
    if (!position) return undefined;
    const caipId = position.chain;
    if (isNonEvmChainId(caipId)) return caipId;
    if (!isBridgeEnabledSource(caipId)) return undefined;
    return formatChainIdToHex(caipId);
  }, [position, isBridgeEnabledSource]);

  const isUnsupportedChain = Boolean(position && !destChainId);

  // Hosts that already hold the fully-resolved token (e.g. the asset-details
  // page) pass its decimals on the target, in which case there is nothing to
  // fetch — mirroring how the Swap UI seeds its destination token directly
  // from the asset the user is looking at (`toCurrentTokenAsBridgeToken`).
  const hasHostTokenMetadata = position?.tokenDecimals !== undefined;

  // Fetch token metadata (decimals, image) from Token Metadata API for the
  // dest token. Skipped for natives (handled via getNativeSourceToken) and
  // when the host already provided the token's metadata.
  const { assetMetadata, pending: isMetadataLoading } = useAssetMetadata(
    metadataQuery,
    Boolean(position && destChainId && !isNativeAsset && !hasHostTokenMetadata),
    destChainId,
  );

  // Build destination token (the token the user wants to buy).
  //
  // For non-EVM chains (e.g. Solana) we store the CAIP-19 assetId
  // (`solana:.../token:<addr>`) in `address`, matching the convention
  // `getNativeSourceToken` uses for source tokens. The bridge-controller's
  // returned quotes carry `destAsset.assetId` in this same CAIP form, so
  // `useQuickBuyQuotes.isActiveQuoteForCurrentTokenPair` can compare the
  // two without format mismatches.
  const destToken = useMemo<BridgeToken | undefined>(() => {
    if (!position || !destChainId) return undefined;

    // Native asset (SOL, BTC, TRX, POL, ETH, …): synthesize from the chain's
    // native asset registry. The Token Metadata API can't resolve `slip44:NNN`
    // references but `getNativeSourceToken` already encapsulates
    // symbol/decimals/image for every supported native asset. Wrap in
    // try/catch because the underlying `getNativeAssetForChainId` THROWS for
    // chains absent from `SWAPS_CHAINID_DEFAULT_TOKEN_MAP` — better to leave
    // `destToken` undefined (surfacing an unsupported-chain UX) than to crash
    // the sheet for an exotic chain.
    if (isNativeAsset) {
      try {
        const native = getNativeSourceToken(destChainId);
        return {
          address: native.address,
          symbol: position.tokenSymbol || native.symbol,
          name: position.tokenName || native.name,
          decimals: native.decimals,
          image: native.image,
          chainId: destChainId,
        };
      } catch {
        return undefined;
      }
    }

    // For EVM tokens the on-chain `address` field must be the bare hex (the
    // bridge-controller's quote endpoint expects this). When the position
    // came in as a CAIP-19 wrapper we use the unwrapped reference, otherwise
    // the original bare address is preserved.
    const evmAddress = parsedTokenAddress ?? position.tokenAddress;

    // Host-provided metadata: build the token directly — no fetch round-trip
    // and no dependency on per-chain address validation, which is what makes
    // e.g. TRC-20 assets on Tron quotable from the asset-details page.
    // `formatAddressToAssetId` passes CAIP-19 inputs through and wraps bare
    // Solana/Tron addresses into their `token:`/`trc20:` asset ids.
    if (position.tokenDecimals !== undefined) {
      return {
        address: isNonEvmChainId(destChainId)
          ? (formatAddressToAssetId(position.tokenAddress, destChainId) ??
            position.tokenAddress)
          : evmAddress,
        symbol: position.tokenSymbol,
        name: position.tokenName,
        decimals: position.tokenDecimals,
        image: position.tokenImage ?? '',
        chainId: destChainId,
      };
    }

    if (assetMetadata) {
      return {
        address: isNonEvmChainId(destChainId)
          ? (formatAddressToAssetId(assetMetadata.address, destChainId) ??
            assetMetadata.address)
          : evmAddress,
        symbol: position.tokenSymbol,
        name: position.tokenName,
        decimals: assetMetadata.decimals,
        image: assetMetadata.image,
        chainId: destChainId,
      };
    }

    return undefined;
  }, [position, destChainId, assetMetadata, isNativeAsset, parsedTokenAddress]);

  // Setup has settled (supported chain, metadata resolved) but produced no
  // destination token — quote fetching can never start, so the consumer must
  // surface this instead of leaving the sheet inert.
  const isDestTokenUnavailable = Boolean(
    position && destChainId && !isMetadataLoading && !destToken,
  );

  return {
    chainId: destChainId,
    destToken,
    isLoading: isMetadataLoading,
    isUnsupportedChain,
    isDestTokenUnavailable,
  };
};
