import React from 'react';
import { View } from 'react-native';
import { render, within } from '@testing-library/react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProMarketLayout from './PerpsProMarketLayout';
import {
  PRO_ORDER_BOOK_COLUMN_WIDTH,
  PRO_SCREEN_HORIZONTAL_INSET,
  PRO_TRADING_AREA_BOTTOM_INSET,
} from './PerpsProMarketLayout.styles';

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
    expect(rightColumn).toHaveStyle({ width: PRO_ORDER_BOOK_COLUMN_WIDTH });
  });

  it('uses the correct width and padding for the order book column', () => {
    const { getByTestId } = renderLayout();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN),
    ).toHaveStyle({
      width: PRO_ORDER_BOOK_COLUMN_WIDTH,
      paddingLeft: 0,
    });
  });

  it('uses content-driven column heights with bottom inset on each column', () => {
    const { getByTestId } = renderLayout();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT)).toHaveStyle({
      paddingHorizontal: PRO_SCREEN_HORIZONTAL_INSET,
    });
    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LEFT_COLUMN)).toHaveStyle(
      {
        alignSelf: 'flex-start',
        paddingBottom: PRO_TRADING_AREA_BOTTOM_INSET,
      },
    );
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN),
    ).toHaveStyle({
      width: PRO_ORDER_BOOK_COLUMN_WIDTH,
      alignSelf: 'flex-start',
      paddingBottom: PRO_TRADING_AREA_BOTTOM_INSET,
    });
  });

  it('hides the order book column when collapsed', () => {
    const { getByTestId, queryByTestId } = renderLayout({
      isOrderBookCollapsed: true,
    });

    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN),
    ).not.toBeOnTheScreen();
    expect(getByTestId('mock-order-form')).toBeOnTheScreen();
  });
});
