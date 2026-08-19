import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';

import { getQuoteStreamReasonString } from './getQuoteStreamReasonString';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const REASON_TO_LOCALE_KEY = {
  [QuoteStreamCompleteReason.RETRY]: 'bridge.quote_stream_complete_retry',
  [QuoteStreamCompleteReason.AMOUNT_TOO_HIGH]:
    'bridge.quote_stream_complete_amount_too_high',
  [QuoteStreamCompleteReason.AMOUNT_TOO_LOW]:
    'bridge.quote_stream_complete_amount_too_low',
  [QuoteStreamCompleteReason.SLIPPAGE_TOO_HIGH]:
    'bridge.quote_stream_complete_slippage_too_high',
  [QuoteStreamCompleteReason.SLIPPAGE_TOO_LOW]:
    'bridge.quote_stream_complete_slippage_too_low',
  [QuoteStreamCompleteReason.TOKEN_NOT_SUPPORTED]:
    'bridge.quote_stream_complete_token_not_supported',
  [QuoteStreamCompleteReason.RWA_GEO_RESTRICTED]:
    'bridge.quote_stream_complete_rwa_geo_restricted',
  [QuoteStreamCompleteReason.RWA_NATIVE_TOKEN_UNSUPPORTED]:
    'bridge.quote_stream_complete_rwa_native_token_unsupported',
  [QuoteStreamCompleteReason.RWA_MARKET_UNAVAILABLE]:
    'bridge.quote_stream_complete_rwa_market_unavailable',
} as const satisfies Record<QuoteStreamCompleteReason, string>;

describe('getQuoteStreamReasonString', () => {
  it.each(
    Object.entries(REASON_TO_LOCALE_KEY) as [QuoteStreamCompleteReason, string][],
  )('maps %s to %s locale key', (reason, localeKey) => {
    const result = getQuoteStreamReasonString(reason);

    expect(result).toBe(localeKey);
  });

  it('returns retry locale key when reason is undefined', () => {
    const result = getQuoteStreamReasonString(undefined);

    expect(result).toBe('bridge.quote_stream_complete_retry');
  });

  it('returns retry locale key for unrecognized reason values', () => {
    const result = getQuoteStreamReasonString(
      'UNKNOWN' as QuoteStreamCompleteReason,
    );

    expect(result).toBe('bridge.quote_stream_complete_retry');
  });
});
