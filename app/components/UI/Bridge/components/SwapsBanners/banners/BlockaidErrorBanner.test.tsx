import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { BlockaidErrorBanner } from './BlockaidErrorBanner';
import { createBannerState } from './testUtils';

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

type QuoteContextValue = ReturnType<typeof useBridgeQuoteDataContext>;

const setQuoteData = (overrides: Partial<QuoteContextValue> = {}) => {
  jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
    blockaidError: null,
    ...overrides,
  } as unknown as QuoteContextValue);
};

// Rendered next to the confirm button rather than in the banner stack, so it
// works without the SwapsBanners container.
const renderBlockaidErrorBanner = () =>
  renderWithProvider(<BlockaidErrorBanner />, { state: createBannerState() });

describe('BlockaidErrorBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQuoteData();
  });

  it('reports the security risk found in the transaction', () => {
    setQuoteData({ blockaidError: 'This transaction may be a security risk' });

    const { getByText } = renderBlockaidErrorBanner();

    expect(getByText(strings('bridge.blockaid_error_title'))).toBeOnTheScreen();
    expect(
      getByText('This transaction may be a security risk'),
    ).toBeOnTheScreen();
  });

  it('renders nothing when the transaction raises no security risk', () => {
    const { queryByTestId } = renderBlockaidErrorBanner();

    expect(queryByTestId(SwapsBannersSelectorsIDs.BLOCKAID_ERROR)).toBeNull();
  });
});
