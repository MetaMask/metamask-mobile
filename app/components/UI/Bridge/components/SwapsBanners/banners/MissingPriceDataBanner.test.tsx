import React from 'react';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { MissingPriceDataBanner } from './MissingPriceDataBanner';
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

describe('MissingPriceDataBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQuoteData();
  });

  it('is shown when the active quote has no price impact data', () => {
    setQuoteData({
      activeQuote: { quote: {} } as QuoteContextValue['activeQuote'],
    });

    const { getByTestId } = renderBanner(<MissingPriceDataBanner />);

    expect(
      getByTestId(SwapsBannersSelectorsIDs.MISSING_PRICE),
    ).toBeOnTheScreen();
  });

  it('is hidden while no amount has been entered', () => {
    setQuoteData({
      activeQuote: { quote: {} } as QuoteContextValue['activeQuote'],
    });

    const { queryByTestId } = renderBanner(<MissingPriceDataBanner />, {
      state: createBannerState({ sourceAmount: '0' }),
    });

    expect(queryByTestId(SwapsBannersSelectorsIDs.MISSING_PRICE)).toBeNull();
  });

  it('is hidden when the quote carries price impact data', () => {
    setQuoteData({
      activeQuote: {
        quote: { priceData: { priceImpact: { amount: '0.01' } } },
      } as QuoteContextValue['activeQuote'],
    });

    const { queryByTestId } = renderBanner(<MissingPriceDataBanner />);

    expect(queryByTestId(SwapsBannersSelectorsIDs.MISSING_PRICE)).toBeNull();
  });
});
