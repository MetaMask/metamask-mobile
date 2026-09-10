import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
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
 * Unit fallback: LimitOrderDetails is a nested card, not a screen. Its rows are
 * driven entirely by props, so only the source-amount visibility gate needs
 * Redux state.
 */

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

function renderLimitOrderDetails(
  bridgeReducerOverrides: NonNullable<
    Parameters<typeof createBridgeTestState>[0]
  >['bridgeReducerOverrides'] = {},
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
  });

  it('renders expiration, slippage, and network fee rows when an amount is entered', () => {
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
  });

  it('renders nothing when source amount is empty', () => {
    const { queryByTestId } = renderLimitOrderDetails({
      sourceAmount: '',
    });

    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders nothing when source amount is zero', () => {
    const { queryByTestId } = renderLimitOrderDetails({
      sourceAmount: '0',
    });

    expect(queryByTestId(LimitOrderDetailsSelectorsIDs.CONTAINER)).toBeNull();
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
