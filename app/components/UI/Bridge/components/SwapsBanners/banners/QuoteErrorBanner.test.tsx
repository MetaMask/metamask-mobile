import React from 'react';
import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import { strings } from '../../../../../../../locales/i18n';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { QuoteErrorBanner } from './QuoteErrorBanner';
import {
  createBannerState,
  createStockRwaToken,
  renderBanner,
} from './testUtils';

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

type QuoteContextValue = ReturnType<typeof useBridgeQuoteDataContext>;

const setQuoteData = (overrides: Partial<QuoteContextValue> = {}) => {
  jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
    activeQuote: undefined,
    quoteFetchError: null,
    ...overrides,
  } as unknown as QuoteContextValue);
};

describe('QuoteErrorBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQuoteData();
  });

  it('explains why the quote stream completed without a quote', () => {
    const { getByText } = renderBanner(<QuoteErrorBanner />, {
      state: createBannerState({
        quoteStreamComplete: {
          quoteCount: 0,
          hasQuotes: false,
          reason: QuoteStreamCompleteReason.AMOUNT_TOO_HIGH,
        },
      }),
    });

    expect(
      getByText(strings('bridge.quote_stream_complete_amount_too_high')),
    ).toBeOnTheScreen();
  });

  it('falls back to the retry message when the quote fetch fails', () => {
    setQuoteData({ quoteFetchError: 'Network error' });

    const { getByText } = renderBanner(<QuoteErrorBanner />);

    expect(
      getByText(strings('bridge.quote_stream_complete_retry')),
    ).toBeOnTheScreen();
  });

  it('renders nothing while quotes are being fetched without error', () => {
    const { queryByTestId } = renderBanner(<QuoteErrorBanner />);

    expect(queryByTestId(SwapsBannersSelectorsIDs.QUOTE_ERROR)).toBeNull();
  });

  it('hides the market-unavailable error when the dest stock market is fully closed', () => {
    const nowMs = Date.now();
    const { queryByTestId } = renderBanner(<QuoteErrorBanner />, {
      state: createBannerState({
        destToken: createStockRwaToken({
          nowMs,
          inRegularHours: false,
          inOffHours: false,
        }),
        quoteStreamComplete: {
          quoteCount: 0,
          hasQuotes: false,
          reason: QuoteStreamCompleteReason.RWA_MARKET_UNAVAILABLE,
        },
        rwaEnabled: true,
      }),
    });

    expect(queryByTestId(SwapsBannersSelectorsIDs.QUOTE_ERROR)).toBeNull();
  });
});
