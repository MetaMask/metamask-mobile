import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import { getQuoteStreamReasonString } from './BridgeView.utils';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockStrings = strings as jest.Mock;

describe('getQuoteStreamReasonString', () => {
  beforeEach(() => {
    mockStrings.mockClear();
  });

  it.each([
    [QuoteStreamCompleteReason.RETRY, 'bridge.quote_stream_complete_retry'],
    [
      QuoteStreamCompleteReason.AMOUNT_TOO_HIGH,
      'bridge.quote_stream_complete_amount_too_high',
    ],
    [
      QuoteStreamCompleteReason.AMOUNT_TOO_LOW,
      'bridge.quote_stream_complete_amount_too_low',
    ],
    [
      QuoteStreamCompleteReason.SLIPPAGE_TOO_HIGH,
      'bridge.quote_stream_complete_slippage_too_high',
    ],
    [
      QuoteStreamCompleteReason.SLIPPAGE_TOO_LOW,
      'bridge.quote_stream_complete_slippage_too_low',
    ],
    [
      QuoteStreamCompleteReason.TOKEN_NOT_SUPPORTED,
      'bridge.quote_stream_complete_token_not_supported',
    ],
    [
      QuoteStreamCompleteReason.RWA_GEO_RESTRICTED,
      'bridge.quote_stream_complete_rwa_geo_restricted',
    ],
    [
      QuoteStreamCompleteReason.RWA_NATIVE_TOKEN_UNSUPPORTED,
      'bridge.quote_stream_complete_rwa_native_token_unsupported',
    ],
    [
      QuoteStreamCompleteReason.RWA_MARKET_UNAVAILABLE,
      'bridge.quote_stream_complete_rwa_market_unavailable',
    ],
  ])('maps %s to the correct locale key', (reason, expectedKey) => {
    getQuoteStreamReasonString(reason);

    expect(mockStrings).toHaveBeenCalledWith(expectedKey);
  });

  it('returns the retry string when called with no argument', () => {
    getQuoteStreamReasonString();

    expect(mockStrings).toHaveBeenCalledWith(
      'bridge.quote_stream_complete_retry',
    );
  });
});
