import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import {
  createBridgeTestState,
  createMockTokenWithBalance,
} from '../../testUtils';
import LimitOrderDetails from './index';
import { LimitOrderDetailsSelectorsIDs } from './testIds';
import { ExpirationRowSelectorsIDs } from './ExpirationRow/testIds';
import { NetworkFeeRowSelectorsIDs } from './NetworkFeeRow/testIds';
import { PriceRowSelectorsIDs } from './PriceRow/testIds';
import type { LimitOrderDetailsProps } from './types';

/**
 * Unit fallback: LimitOrderDetails is a nested card, not a screen. Visibility
 * depends on quote context that component-view tests would need the full
 * BridgeQuoteDataProvider and quote fetch to drive.
 */
jest.mock('../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

type QuoteContextValue = ReturnType<typeof useBridgeQuoteDataContext>;

const mockFeeToken = createMockTokenWithBalance({
  symbol: 'ETH',
  name: 'Ether',
});

const defaultProps: LimitOrderDetailsProps = {
  expiration: '1 hour',
  onExpirationPress: jest.fn(),
  slippage: '2%',
  onPricePress: jest.fn(),
  networkFee: '$1.69',
  feeToken: mockFeeToken,
};

const setQuoteData = (overrides: Partial<QuoteContextValue> = {}) => {
  jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
    ...mockUseBridgeQuoteData,
    ...overrides,
  } as unknown as QuoteContextValue);
};

function renderLimitOrderDetails(
  bridgeReducerOverrides: Parameters<
    typeof createBridgeTestState
  >[0]['bridgeReducerOverrides'] = {},
  props: Partial<LimitOrderDetailsProps> = {},
) {
  return renderWithProvider(
    <LimitOrderDetails {...defaultProps} {...props} />,
    {
      state: createBridgeTestState({
        bridgeReducerOverrides,
      }),
    },
  );
}

describe('LimitOrderDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setQuoteData();
  });

  it('renders expiration, slippage, and network fee rows when an active quote exists', () => {
    const { getByTestId } = renderLimitOrderDetails();

    expect(
      getByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByTestId(ExpirationRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(PriceRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(NetworkFeeRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = renderLimitOrderDetails(
      {},
      { testID: 'custom-limit-order-details' },
    );

    expect(getByTestId('custom-limit-order-details')).toBeOnTheScreen();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders nothing when source amount is missing', () => {
    const { queryByTestId } = renderLimitOrderDetails({
      sourceAmount: undefined,
    });

    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.SKELETON)).toBeNull();
  });

  it('renders nothing when source amount is empty', () => {
    const { queryByTestId } = renderLimitOrderDetails({
      sourceAmount: '',
    });

    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.SKELETON)).toBeNull();
  });

  it('renders nothing when source amount is zero', () => {
    const { queryByTestId } = renderLimitOrderDetails({
      sourceAmount: '0',
    });

    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.SKELETON)).toBeNull();
  });

  it('renders a three-row loading skeleton when quotes are still loading', () => {
    setQuoteData({
      activeQuote: undefined,
      isLoading: true,
      needsNewQuote: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
    });

    const { getByTestId, getAllByTestId, queryByTestId } =
      renderLimitOrderDetails();

    expect(
      getByTestId(LimitOrderDetailsSelectorsIDs.SKELETON),
    ).toBeOnTheScreen();
    expect(
      getAllByTestId(LimitOrderDetailsSelectorsIDs.SKELETON_ROW),
    ).toHaveLength(3);
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders a loading skeleton when a non-zero amount has no active quote yet', () => {
    setQuoteData({
      activeQuote: undefined,
      isLoading: false,
      needsNewQuote: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
    });

    const { getByTestId, queryByTestId } = renderLimitOrderDetails();

    expect(
      getByTestId(LimitOrderDetailsSelectorsIDs.SKELETON),
    ).toBeOnTheScreen();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders nothing when a new quote is required and none is active', () => {
    setQuoteData({
      activeQuote: undefined,
      needsNewQuote: true,
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
    });

    const { queryByTestId } = renderLimitOrderDetails();

    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.SKELETON)).toBeNull();
  });

  it('renders nothing when no quotes are available', () => {
    setQuoteData({
      activeQuote: undefined,
      isNoQuotesAvailable: true,
      isLoading: false,
    });

    const { queryByTestId } = renderLimitOrderDetails();

    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.SKELETON)).toBeNull();
  });

  it('renders nothing when quote fetch fails', () => {
    setQuoteData({
      activeQuote: undefined,
      quoteFetchError: 'Quote fetch failed',
      isLoading: false,
    });

    const { queryByTestId } = renderLimitOrderDetails();

    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.SKELETON)).toBeNull();
  });

  it('keeps details visible while refreshing an existing quote', () => {
    setQuoteData({
      isLoading: true,
    });

    const { getByTestId, queryByTestId } = renderLimitOrderDetails();

    expect(
      getByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.SKELETON)).toBeNull();
  });

  it('calls onExpirationPress when the expiration row is pressed', () => {
    const { getByTestId } = renderLimitOrderDetails();

    fireEvent.press(getByTestId(ExpirationRowSelectorsIDs.CONTAINER));

    expect(defaultProps.onExpirationPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPricePress when the slippage row is pressed', () => {
    const { getByTestId } = renderLimitOrderDetails();

    fireEvent.press(getByTestId(PriceRowSelectorsIDs.CONTAINER));

    expect(defaultProps.onPricePress).toHaveBeenCalledTimes(1);
  });

  it('calls onNetworkFeePress when the network fee row is pressed', () => {
    const onNetworkFeePress = jest.fn();
    const { getByTestId } = renderLimitOrderDetails({}, { onNetworkFeePress });

    fireEvent.press(getByTestId(NetworkFeeRowSelectorsIDs.CONTAINER));

    expect(onNetworkFeePress).toHaveBeenCalledTimes(1);
  });
});
