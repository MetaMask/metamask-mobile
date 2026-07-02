import {
  formatChainIdToCaip,
  QuoteStreamCompleteReason,
} from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import { areAddressesEqual } from '../../../../../util/address';
import { BridgeToken, BridgeViewMode } from '../../types';

export const getHeaderTitle = (bridgeViewMode?: BridgeViewMode) => {
  if (bridgeViewMode === BridgeViewMode.Bridge) {
    return strings('bridge.title');
  }

  if (
    bridgeViewMode === BridgeViewMode.Swap ||
    bridgeViewMode === BridgeViewMode.Unified
  ) {
    return strings('swaps.title');
  }

  return `${strings('swaps.title')}/${strings('bridge.title')}`;
};

export const areBridgeTokensEqual = (
  firstToken?: BridgeToken,
  secondToken?: BridgeToken,
) =>
  Boolean(
    firstToken &&
      secondToken &&
      areAddressesEqual(firstToken.address, secondToken.address) &&
      formatChainIdToCaip(firstToken.chainId) ===
        formatChainIdToCaip(secondToken.chainId),
  );

export const areDisplayedBridgeTokensSyncedWithRedux = ({
  sourceToken,
  destToken,
  displaySourceToken,
  displayDestToken,
}: {
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  displaySourceToken?: BridgeToken;
  displayDestToken?: BridgeToken;
}) =>
  areBridgeTokensEqual(sourceToken, displaySourceToken) &&
  areBridgeTokensEqual(destToken, displayDestToken);

export const getQuoteStreamReasonString = (
  reason?: QuoteStreamCompleteReason,
): string => {
  switch (reason) {
    case QuoteStreamCompleteReason.RETRY:
      return strings('bridge.quote_stream_complete_retry');
    case QuoteStreamCompleteReason.AMOUNT_TOO_HIGH:
      return strings('bridge.quote_stream_complete_amount_too_high');
    case QuoteStreamCompleteReason.AMOUNT_TOO_LOW:
      return strings('bridge.quote_stream_complete_amount_too_low');
    case QuoteStreamCompleteReason.SLIPPAGE_TOO_HIGH:
      return strings('bridge.quote_stream_complete_slippage_too_high');
    case QuoteStreamCompleteReason.SLIPPAGE_TOO_LOW:
      return strings('bridge.quote_stream_complete_slippage_too_low');
    case QuoteStreamCompleteReason.TOKEN_NOT_SUPPORTED:
      return strings('bridge.quote_stream_complete_token_not_supported');
    case QuoteStreamCompleteReason.RWA_GEO_RESTRICTED:
      return strings('bridge.quote_stream_complete_rwa_geo_restricted');
    case QuoteStreamCompleteReason.RWA_NATIVE_TOKEN_UNSUPPORTED:
      return strings(
        'bridge.quote_stream_complete_rwa_native_token_unsupported',
      );
    case QuoteStreamCompleteReason.RWA_MARKET_UNAVAILABLE:
      return strings('bridge.quote_stream_complete_rwa_market_unavailable');
    default:
      return strings('bridge.quote_stream_complete_retry');
  }
};
