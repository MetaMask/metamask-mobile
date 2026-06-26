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

  // Destination chain from the target — hex for EVM, CAIP for non-EVM.
  const destChainId = useMemo(() => {
    if (!position) return undefined;
    const caipId = position.chain;
    if (isNonEvmChainId(caipId)) return caipId;
    if (!isBridgeEnabledSource(caipId)) return undefined;
    return formatChainIdToHex(caipId);
  }, [position, isBridgeEnabledSource]);

  const isUnsupportedChain = Boolean(position && !destChainId);

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

  // Fetch token metadata (decimals, image) from Token Metadata API for the
  // dest token. Skipped for natives (handled via getNativeSourceToken).
  const { assetMetadata, pending: isMetadataLoading } = useAssetMetadata(
    metadataQuery,
    Boolean(position && destChainId && !isNativeAsset),
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

    if (assetMetadata) {
      // For EVM tokens the on-chain `address` field must be the bare hex (the
      // bridge-controller's quote endpoint expects this). When the position
      // came in as a CAIP-19 wrapper we use the unwrapped reference, otherwise
      // the original bare address is preserved.
      const evmAddress = parsedTokenAddress ?? position.tokenAddress;
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

  return {
    chainId: destChainId,
    destToken,
    isLoading: isMetadataLoading,
    isUnsupportedChain,
  };
};
