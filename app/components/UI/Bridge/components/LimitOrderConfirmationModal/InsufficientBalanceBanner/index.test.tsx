import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { InsufficientBalanceBanner } from './';
import { InsufficientBalanceBannerSelectorsIDs } from './testIds';

describe('InsufficientBalanceBanner', () => {
  it('displays the warning with a link to swap into the source token', () => {
    const { getByTestId } = render(
      <InsufficientBalanceBanner
        insufficientBalance={{ onSwapIntoSourceTokenPress: jest.fn() }}
        sourceTokenSymbol="ETH"
      />,
    );

    expect(
      getByTestId(InsufficientBalanceBannerSelectorsIDs.CONTAINER),
    ).toHaveTextContent(
      'Your ETH balance is too low to fill this order. If it’s still too low when your trigger condition is met, the order won’t go through.Swap into ETH',
    );
  });

  it('calls the swap handler when the link is pressed', () => {
    const onSwapIntoSourceTokenPress = jest.fn();
    const { getByTestId } = render(
      <InsufficientBalanceBanner
        insufficientBalance={{ onSwapIntoSourceTokenPress }}
        sourceTokenSymbol="ETH"
      />,
    );

    fireEvent.press(
      getByTestId(
        InsufficientBalanceBannerSelectorsIDs.SWAP_INTO_SOURCE_TOKEN_LINK,
      ),
    );

    expect(onSwapIntoSourceTokenPress).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when the balance covers the order', () => {
    const { queryByTestId } = render(
      <InsufficientBalanceBanner sourceTokenSymbol="ETH" />,
    );

    expect(
      queryByTestId(InsufficientBalanceBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
  });
});
