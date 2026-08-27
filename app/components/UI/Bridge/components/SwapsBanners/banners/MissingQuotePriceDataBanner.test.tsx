import React from 'react';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { createMockToken } from '../../../testUtils';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { MissingQuotePriceDataBanner } from './MissingQuotePriceDataBanner';
import { createBannerState, renderBanner } from './testUtils';

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

describe('MissingQuotePriceDataBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQuoteData();
  });

  it('is shown when the active quote has no price impact data', () => {
    setQuoteData({
      activeQuote: { quote: {} } as QuoteContextValue['activeQuote'],
    });

    const { getByTestId } = renderBanner(<MissingQuotePriceDataBanner />);

    expect(
      getByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_PRICE),
    ).toBeOnTheScreen();
  });

  it('is hidden while no amount has been entered', () => {
    setQuoteData({
      activeQuote: { quote: {} } as QuoteContextValue['activeQuote'],
    });

    const { queryByTestId } = renderBanner(<MissingQuotePriceDataBanner />, {
      state: createBannerState({ sourceAmount: '0' }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_PRICE),
    ).toBeNull();
  });

  it('is hidden when the quote carries price impact data', () => {
    setQuoteData({
      activeQuote: {
        quote: { priceData: { priceImpact: { amount: '0.01' } } },
      } as QuoteContextValue['activeQuote'],
    });

    const { queryByTestId } = renderBanner(<MissingQuotePriceDataBanner />);

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_PRICE),
    ).toBeNull();
  });

  it('stays hidden when the quote is priced but a traded token has no fiat rate', () => {
    setQuoteData({
      activeQuote: {
        quote: { priceData: { priceImpact: { amount: '0.01' } } },
      } as QuoteContextValue['activeQuote'],
    });

    const { queryByTestId } = renderBanner(<MissingQuotePriceDataBanner />, {
      // Absent from market data in the mocked state, so it has no fiat rate.
      state: createBannerState({
        destToken: createMockToken({
          address: '0x00000000000000000000000000000000000000ff',
          symbol: 'MUSD',
        }),
      }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_PRICE),
    ).toBeNull();
  });
});
