import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';

export const QUOTE_STREAM_REASON_TO_STRING: Record<
  QuoteStreamCompleteReason,
  string
> = {
  [QuoteStreamCompleteReason.RETRY]: strings(
    'bridge.quote_stream_complete_retry',
  ),
  [QuoteStreamCompleteReason.AMOUNT_TOO_HIGH]: strings(
    'bridge.quote_stream_complete_amount_too_high',
  ),
  [QuoteStreamCompleteReason.AMOUNT_TOO_LOW]: strings(
    'bridge.quote_stream_complete_amount_too_low',
  ),
  [QuoteStreamCompleteReason.SLIPPAGE_TOO_HIGH]: strings(
    'bridge.quote_stream_complete_slippage_too_high',
  ),
  [QuoteStreamCompleteReason.SLIPPAGE_TOO_LOW]: strings(
    'bridge.quote_stream_complete_slippage_too_low',
  ),
  [QuoteStreamCompleteReason.TOKEN_NOT_SUPPORTED]: strings(
    'bridge.quote_stream_complete_token_not_supported',
  ),
  [QuoteStreamCompleteReason.RWA_GEO_RESTRICTED]: strings(
    'bridge.quote_stream_complete_rwa_geo_restricted',
  ),
  [QuoteStreamCompleteReason.RWA_NATIVE_TOKEN_UNSUPPORTED]: strings(
    'bridge.quote_stream_complete_rwa_native_token_unsupported',
  ),
  [QuoteStreamCompleteReason.RWA_MARKET_UNAVAILABLE]: strings(
    'bridge.quote_stream_complete_rwa_market_unavailable',
  ),
};
