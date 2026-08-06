import React from 'react';
import { View } from 'react-native';
import { render, within } from '@testing-library/react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProMarketLayout from './PerpsProMarketLayout';
import {
  PRO_ORDER_BOOK_COLUMN_WIDTH,
  PRO_ORDER_BOOK_CONTENT_WIDTH,
  PRO_SCREEN_HORIZONTAL_INSET,
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
    expect(rightColumn).toHaveStyle({ width: 148 });
  });

  it('uses matching insets on both sides of the order book', () => {
    const { getByTestId } = renderLayout();

    expect(PRO_ORDER_BOOK_COLUMN_WIDTH - PRO_SCREEN_HORIZONTAL_INSET).toBe(
      PRO_ORDER_BOOK_CONTENT_WIDTH,
    );
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN),
    ).toHaveStyle({
      width: PRO_ORDER_BOOK_COLUMN_WIDTH,
      paddingLeft: PRO_SCREEN_HORIZONTAL_INSET,
    });
  });

  it('uses content-driven column heights without a fixed trading-area min height', () => {
    const { getByTestId } = renderLayout();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT)).toHaveStyle({
      paddingBottom: 16,
      paddingHorizontal: 8,
    });
    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LEFT_COLUMN)).toHaveStyle(
      {
        alignSelf: 'flex-start',
      },
    );
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN),
    ).toHaveStyle({
      width: 148,
      alignSelf: 'flex-start',
      paddingLeft: 8,
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
