import React from 'react';
import { ethToken1Address } from '../../../_mocks_/initialState';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { createMockToken } from '../../../testUtils';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { MissingQuoteAndAssetsPriceDataBanner } from './MissingQuoteAndAssetsPriceDataBanner';
import { createBannerState, renderBanner } from './testUtils';

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

type QuoteContextValue = ReturnType<typeof useBridgeQuoteDataContext>;

// Has market data in the mocked state, so it resolves to a real fiat rate.
const pricedToken = createMockToken({
  address: ethToken1Address,
  symbol: 'TOKEN1',
});
// Absent from market data, so it has no fiat rate to price it with.
const unpricedToken = createMockToken({
  address: '0x00000000000000000000000000000000000000ff',
  symbol: 'MUSD',
});

const setQuoteData = (overrides: Partial<QuoteContextValue> = {}) => {
  jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
    activeQuote: undefined,
    quoteFetchError: null,
    isActiveQuoteForCurrentTokenPair: true,
    ...overrides,
  } as unknown as QuoteContextValue);
};

const setQuoteWithPriceImpact = () =>
  setQuoteData({
    activeQuote: {
      quote: { priceData: { priceImpact: { amount: '0.01' } } },
    } as QuoteContextValue['activeQuote'],
  });

describe('MissingQuoteAndAssetsPriceDataBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQuoteData();
  });

  it('is shown when the active quote has no price impact data', () => {
    setQuoteData({
      activeQuote: { quote: {} } as QuoteContextValue['activeQuote'],
    });

    const { getByTestId } = renderBanner(
      <MissingQuoteAndAssetsPriceDataBanner />,
      { state: createBannerState({ destToken: pricedToken }) },
    );

    expect(
      getByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_AND_ASSETS_PRICE),
    ).toBeOnTheScreen();
  });

  it('is shown when the destination token has no fiat rate', () => {
    setQuoteWithPriceImpact();

    const { getByTestId } = renderBanner(
      <MissingQuoteAndAssetsPriceDataBanner />,
      { state: createBannerState({ destToken: unpricedToken }) },
    );

    expect(
      getByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_AND_ASSETS_PRICE),
    ).toBeOnTheScreen();
  });

  it('is shown when the source token has no fiat rate', () => {
    setQuoteWithPriceImpact();

    const { getByTestId } = renderBanner(
      <MissingQuoteAndAssetsPriceDataBanner />,
      {
        state: createBannerState({
          sourceToken: unpricedToken,
          destToken: pricedToken,
        }),
      },
    );

    expect(
      getByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_AND_ASSETS_PRICE),
    ).toBeOnTheScreen();
  });

  it('is hidden while no amount has been entered', () => {
    setQuoteData({
      activeQuote: { quote: {} } as QuoteContextValue['activeQuote'],
    });

    const { queryByTestId } = renderBanner(
      <MissingQuoteAndAssetsPriceDataBanner />,
      {
        state: createBannerState({
          sourceAmount: '0',
          destToken: unpricedToken,
        }),
      },
    );

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_AND_ASSETS_PRICE),
    ).toBeNull();
  });

  it('is hidden until a quote comes back, even when a token has no fiat rate', () => {
    const { queryByTestId } = renderBanner(
      <MissingQuoteAndAssetsPriceDataBanner />,
      { state: createBannerState({ destToken: unpricedToken }) },
    );

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_AND_ASSETS_PRICE),
    ).toBeNull();
  });

  it('is hidden while the active quote is for a previous token pair', () => {
    // After a token-selector change the previous quote can linger until the
    // new fetch settles. Fiat rates for the new pair may also be unset in
    // that window — that must not be treated as a missing-price warning.
    setQuoteData({
      activeQuote: {
        quote: { priceData: { priceImpact: { amount: '0.01' } } },
      } as QuoteContextValue['activeQuote'],
      isActiveQuoteForCurrentTokenPair: false,
    });

    const { queryByTestId } = renderBanner(
      <MissingQuoteAndAssetsPriceDataBanner />,
      { state: createBannerState({ destToken: unpricedToken }) },
    );

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_AND_ASSETS_PRICE),
    ).toBeNull();
  });

  it('is hidden when the quote carries price impact data and both tokens are priced', () => {
    setQuoteWithPriceImpact();

    const { queryByTestId } = renderBanner(
      <MissingQuoteAndAssetsPriceDataBanner />,
      { state: createBannerState({ destToken: pricedToken }) },
    );

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_QUOTE_AND_ASSETS_PRICE),
    ).toBeNull();
  });
});
