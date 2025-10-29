import { isNonEvmChainId } from '@metamask/bridge-controller';
import { useMemo } from 'react';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import { BridgeToken } from '../../types';
import { CaipChainId, Hex } from '@metamask/utils';
import { getDecimalChainId } from '../../../../../util/networks';

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

    // Compare chain IDs and addresses directly from the quote
    const normalizeAddress = (addr: string, chainId: Hex | CaipChainId) => {
      const isEvmChain = !isNonEvmChainId(chainId);
      return isEvmChain ? addr.toLowerCase() : addr;
    };

    const srcChainIdMatch =
      activeQuote.quote.srcChainId.toString() ===
      getDecimalChainId(sourceToken.chainId).toString();
    const destChainIdMatch =
      activeQuote.quote.destChainId.toString() ===
      getDecimalChainId(destToken.chainId).toString();

    const srcAddressMatch =
      normalizeAddress(
        activeQuote.quote.srcAsset.address,
        sourceToken.chainId,
      ) === normalizeAddress(sourceToken.address, sourceToken.chainId);

    const destAddressMatch =
      normalizeAddress(
        activeQuote.quote.destAsset.address,
        destToken.chainId,
      ) === normalizeAddress(destToken.address, destToken.chainId);

    const allMatch =
      srcChainIdMatch &&
      destChainIdMatch &&
      srcAddressMatch &&
      destAddressMatch;

    return allMatch;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuote?.quote.requestId, sourceToken, destToken]);
