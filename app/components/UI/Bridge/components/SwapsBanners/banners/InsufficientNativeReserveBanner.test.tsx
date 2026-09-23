import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useBridgeSession } from '../../../hooks/useBridgeSession';
import useIsInsufficientBalance from '../../../hooks/useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../../../hooks/useInsufficientNativeReserveError';
import { BridgeTabKey } from '../../../Views/BridgeView/BridgeView.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { InsufficientNativeReserveBanner } from './InsufficientNativeReserveBanner';
import { renderBanner } from './testUtils';

/**
 * Unit fallback: reserve banner needs isolated quote + session overrides.
 * CV remounts Market on tab switch and cannot hold those matrices.
 */
jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

jest.mock('../../../hooks/useBridgeSession', () => ({
  useBridgeSession: jest.fn(),
}));

jest.mock('../../../hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../hooks/useInsufficientNativeReserveError', () => ({
  useInsufficientNativeReserveError: jest.fn(),
}));

const createMockBridgeSession = (
  overrides: Partial<ReturnType<typeof useBridgeSession>> = {},
) => ({
  selectedTab: BridgeTabKey.Market,
  renderedTab: BridgeTabKey.Market,
  setSelectedTab: jest.fn(),
  setRenderedTab: jest.fn(),
  latestSourceBalance: undefined,
  quoteParams: {},
  ...overrides,
});

describe('InsufficientNativeReserveBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useBridgeSession).mockReturnValue(createMockBridgeSession());
    jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
      activeQuote: undefined,
      quoteFetchError: null,
    } as unknown as ReturnType<typeof useBridgeQuoteDataContext>);
    jest.mocked(useIsInsufficientBalance).mockReturnValue(false);
    jest.mocked(useInsufficientNativeReserveError).mockReturnValue({
      minimumNativeBalanceToBeKeptInAccount: '10',
      maxSwappableNativeBalance: '5',
    });
  });

  it('offers to lower the amount to the maximum swappable balance', () => {
    const onAdjustSourceAmount = jest.fn();

    const { getByText } = renderBanner(<InsufficientNativeReserveBanner />, {
      onAdjustSourceAmount,
    });

    fireEvent.press(
      getByText(strings('bridge.insufficient_native_reserve_cta')),
    );

    expect(onAdjustSourceAmount).toHaveBeenCalledWith('5');
  });

  it('gives way to the insufficient balance state', () => {
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

    const { queryByTestId } = renderBanner(<InsufficientNativeReserveBanner />);

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.INSUFFICIENT_NATIVE_RESERVE),
    ).toBeNull();
  });

  it('renders nothing when the amount leaves the reserve untouched', () => {
    jest.mocked(useInsufficientNativeReserveError).mockReturnValue(undefined);

    const { queryByTestId } = renderBanner(<InsufficientNativeReserveBanner />);

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.INSUFFICIENT_NATIVE_RESERVE),
    ).toBeNull();
  });
});
