import {
  formatAddressToAssetId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useMemo } from 'react';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { BridgeToken } from '../../types';
import { CaipChainId, Hex } from '@metamask/utils';

interface Props {
  activeQuote?: ReturnType<typeof useBridgeQuoteData>['activeQuote'];
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
}

export const useIsBridgeQuoteForCurrentPair = ({
  activeQuote,
  sourceToken,
  destToken,
}: Props) =>
  useMemo(() => {
    if (!activeQuote || !sourceToken || !destToken) {
      return false;
    }

    // Check if quote has required asset information
    if (
      !activeQuote.quote?.srcAsset?.assetId ||
      !activeQuote.quote?.destAsset?.assetId
    ) {
      return false;
    }

    // Normalizes asset ID for comparison (lowercase for EVM, preserve case for non-EVM)
    const normalizeAssetId = (assetId: string, chainId: Hex | CaipChainId) => {
      const isEvmChain = !isNonEvmChainId(chainId);
      return isEvmChain ? assetId.toLowerCase() : assetId;
    };

    // Generate asset IDs from selected tokens
    const getTokenAssetId = (token: BridgeToken) => {
      const isEvmChain = !isNonEvmChainId(token.chainId);
      const formattedAddress = isEvmChain
        ? token.address.toLowerCase()
        : token.address;
      return formatAddressToAssetId(formattedAddress, token.chainId);
    };

    // Compare normalized asset IDs
    const srcMatch =
      normalizeAssetId(
        activeQuote.quote.srcAsset.assetId,
        sourceToken.chainId,
      ) === getTokenAssetId(sourceToken);

    const destMatch =
      normalizeAssetId(
        activeQuote.quote.destAsset.assetId,
        destToken.chainId,
      ) === getTokenAssetId(destToken);

    return srcMatch && destMatch;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuote?.quote.requestId, sourceToken, destToken]);
