import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';

import { BridgeToken } from '../../types';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import { BatchSellReviewTokenRow } from './BatchSellReviewTokenRow';

const mockToken: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
  image: 'eth-image-url',
  balance: '1.498123456',
};
const mockTokenKey = `${mockToken.chainId}:${mockToken.address}`;

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('../../../../../component-library/components-temp/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');

  return {
    Skeleton: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(RNView, { testID }),
  };
});

jest.mock('./BatchSellPercentageSlider', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable: RNPressable, Text: RNText } =
    jest.requireActual('react-native');

  return {
    BatchSellPercentageSlider: ({
      onValueChange,
      onDragEnd,
      testID,
      value,
    }: {
      onValueChange: (value: number) => void;
      onDragEnd?: (value: number) => void;
      testID?: string;
      value: number;
    }) =>
      ReactActual.createElement(
        RNPressable,
        {
          testID,
          onPress: () => {
            onValueChange(75);
            onDragEnd?.(75);
          },
        },
        ReactActual.createElement(RNText, null, `${value}%`),
      ),
  };
});

describe('BatchSellReviewTokenRow', () => {
  const mockOnPercentChange = jest.fn();
  const mockOnSlippagePress = jest.fn();
  const mockOnRemovePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders token loading row content', () => {
    const { getByTestId, getByText } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        isLoading
        onPercentChange={mockOnPercentChange}
        onSlippagePress={mockOnSlippagePress}
        onRemovePress={mockOnRemovePress}
      />,
    );

    expect(
      getByTestId(`${BatchSellReviewSelectorsIDs.TOKEN_ROW}-${mockTokenKey}`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-${mockTokenKey}`,
      ),
    ).toBeOnTheScreen();
    expect(getByText('1.49812 ETH • 100%')).toBeOnTheScreen();
  });

  it('renders the received amount when loaded', () => {
    const { getByText, queryByTestId } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        onPercentChange={mockOnPercentChange}
      />,
    );

    expect(getByText('123.45 USDC')).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-${mockTokenKey}`,
      ),
    ).toBeNull();
  });

  it('renders and forwards high price impact tag presses', () => {
    const mockOnHighPriceImpactPress = jest.fn();
    const { getByTestId, getByText } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        isHighPriceImpact
        onHighPriceImpactPress={mockOnHighPriceImpactPress}
        onPercentChange={mockOnPercentChange}
      />,
    );
    const tag = getByTestId(
      `${BatchSellReviewSelectorsIDs.HIGH_PRICE_IMPACT_TAG}-${mockTokenKey}`,
    );

    expect(getByText('High price impact')).toBeOnTheScreen();
    fireEvent.press(tag);

    expect(mockOnHighPriceImpactPress).toHaveBeenCalledTimes(1);
  });

  it('does not render high price impact tag while loading or unavailable', () => {
    const { queryByTestId, rerender } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        isHighPriceImpact
        isLoading
        onHighPriceImpactPress={jest.fn()}
        onPercentChange={mockOnPercentChange}
      />,
    );
    const tagTestId = `${BatchSellReviewSelectorsIDs.HIGH_PRICE_IMPACT_TAG}-${mockTokenKey}`;

    expect(queryByTestId(tagTestId)).toBeNull();

    rerender(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        isHighPriceImpact
        isQuoteUnavailable
        onHighPriceImpactPress={jest.fn()}
        onPercentChange={mockOnPercentChange}
      />,
    );

    expect(queryByTestId(tagTestId)).toBeNull();
  });

  it('renders a no quote available row state', () => {
    const { getByText, queryByTestId } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        isQuoteUnavailable
        onPercentChange={mockOnPercentChange}
      />,
    );

    const noQuoteText = getByText('No quote available');

    expect(noQuoteText).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-${mockTokenKey}`,
      ),
    ).toBeNull();
  });

  it('matches token picker balance formatting for tiny balances', () => {
    const { getByText } = render(
      <BatchSellReviewTokenRow
        token={{ ...mockToken, balance: '0.000001' }}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        onPercentChange={mockOnPercentChange}
      />,
    );

    expect(getByText('< 0.00001 ETH • 100%')).toBeOnTheScreen();
  });

  it('renders the source amount used in the quote request', () => {
    const { getByText } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={50}
        receivedAmount="123.45 USDC"
        onPercentChange={mockOnPercentChange}
      />,
    );

    expect(getByText('0.74906 ETH • 50%')).toBeOnTheScreen();
  });

  it('forwards slider percent changes on drag end', () => {
    const { getByTestId } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        onPercentChange={mockOnPercentChange}
      />,
    );

    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_SLIDER}-${mockTokenKey}`,
      ),
    );

    expect(mockOnPercentChange).toHaveBeenCalledWith(mockTokenKey, 75);
  });

  it('forwards slippage and remove presses', () => {
    const { getByTestId } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        onPercentChange={mockOnPercentChange}
        onSlippagePress={mockOnSlippagePress}
        onRemovePress={mockOnRemovePress}
      />,
    );

    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.CUSTOMIZE_BUTTON}-${mockTokenKey}`,
      ),
    );
    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.REMOVE_BUTTON}-${mockTokenKey}`,
      ),
    );

    expect(mockOnSlippagePress).toHaveBeenCalledWith(mockToken);
    expect(mockOnRemovePress).toHaveBeenCalledWith(mockToken);
  });

  it('disables remove presses', () => {
    const { getByTestId } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        receivedAmount="123.45 USDC"
        onPercentChange={mockOnPercentChange}
        onRemovePress={mockOnRemovePress}
        isRemoveTokenDisabled
      />,
    );
    const removeButton = getByTestId(
      `${BatchSellReviewSelectorsIDs.REMOVE_BUTTON}-${mockTokenKey}`,
    );

    fireEvent.press(removeButton);

    expect(removeButton.props.accessibilityState.disabled).toBe(true);
    expect(mockOnRemovePress).not.toHaveBeenCalled();
  });
});
