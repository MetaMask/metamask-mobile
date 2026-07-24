import React from 'react';
import { View } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProMarketLayout from './PerpsProMarketLayout';

const renderLayout = (
  props: Partial<React.ComponentProps<typeof PerpsProMarketLayout>> = {},
) =>
  render(
    <PerpsProMarketLayout
      orderForm={<View testID="mock-order-form" />}
      orderBook={<View testID="mock-order-book" />}
      {...props}
    />,
  );

describe('PerpsProMarketLayout', () => {
  it('places the order form left and the order book right', () => {
    const { getByTestId } = renderLayout();

    const leftColumn = getByTestId(PerpsProMarketViewSelectorsIDs.LEFT_COLUMN);
    const rightColumn = getByTestId(
      PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN,
    );

    expect(within(leftColumn).getByTestId('mock-order-form')).toBeOnTheScreen();
    expect(
      within(rightColumn).getByTestId('mock-order-book'),
    ).toBeOnTheScreen();
    expect(leftColumn).toHaveStyle({ flex: 1 });
    expect(rightColumn).toHaveStyle({ width: 132 });
  });

  it('uses the Figma trading-area dimensions', () => {
    const { getByTestId } = renderLayout();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT)).toHaveStyle({
      minHeight: 682,
    });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.VERTICAL_DIVIDER),
    ).toHaveStyle({ width: 24 });
  });

  it('hides the order book and shows expand when collapsed', () => {
    const onExpandOrderBook = jest.fn();
    const { getByTestId, queryByTestId } = renderLayout({
      isOrderBookCollapsed: true,
      onExpandOrderBook,
    });

    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.VERTICAL_DIVIDER),
    ).not.toBeOnTheScreen();
    expect(getByTestId('mock-order-form')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_EXPAND_BUTTON),
    );
    expect(onExpandOrderBook).toHaveBeenCalledTimes(1);
  });
});
