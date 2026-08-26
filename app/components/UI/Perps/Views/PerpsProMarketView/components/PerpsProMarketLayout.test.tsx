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

/** Rendered left-to-right order of the two trading columns. */
const getColumnOrder = (layout: ReturnType<typeof renderLayout>) =>
  within(layout.getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT))
    .getAllByTestId(/-column$/)
    .map((column) => column.props.testID);

describe('PerpsProMarketLayout', () => {
  it('renders each panel in its own column', () => {
    const { getByTestId } = renderLayout();

    const orderFormColumn = getByTestId(
      PerpsProMarketViewSelectorsIDs.ORDER_FORM_COLUMN,
    );
    const orderBookColumn = getByTestId(
      PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLUMN,
    );

    expect(
      within(orderFormColumn).getByTestId('mock-order-form'),
    ).toBeOnTheScreen();
    expect(
      within(orderBookColumn).getByTestId('mock-order-book'),
    ).toBeOnTheScreen();
    expect(orderFormColumn).toHaveStyle({ flex: 1 });
    expect(orderBookColumn).toHaveStyle({
      width: PRO_ORDER_BOOK_COLUMN_WIDTH,
    });
  });

  it('places the order book first when pinned left', () => {
    const layout = renderLayout({ orderBookPosition: 'left' });

    expect(getColumnOrder(layout)).toEqual([
      PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLUMN,
      PerpsProMarketViewSelectorsIDs.ORDER_FORM_COLUMN,
    ]);
  });

  it('places the order book last when pinned right', () => {
    const layout = renderLayout({ orderBookPosition: 'right' });

    expect(getColumnOrder(layout)).toEqual([
      PerpsProMarketViewSelectorsIDs.ORDER_FORM_COLUMN,
      PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLUMN,
    ]);
  });

  it.each(['left', 'right'] as const)(
    'keeps the order book column width and padding when pinned %s',
    (orderBookPosition) => {
      const { getByTestId } = renderLayout({ orderBookPosition });

      expect(
        getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLUMN),
      ).toHaveStyle({
        width: PRO_ORDER_BOOK_COLUMN_WIDTH,
        paddingLeft: 0,
      });
    },
  );

  it('uses content-driven column heights with bottom inset on each column', () => {
    const { getByTestId } = renderLayout();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT)).toHaveStyle({
      paddingHorizontal: PRO_SCREEN_HORIZONTAL_INSET,
    });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_COLUMN),
    ).toHaveStyle({
      alignSelf: 'flex-start',
      paddingBottom: PRO_TRADING_AREA_BOTTOM_INSET,
    });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLUMN),
    ).toHaveStyle({
      width: PRO_ORDER_BOOK_COLUMN_WIDTH,
      alignSelf: 'flex-start',
      paddingBottom: PRO_TRADING_AREA_BOTTOM_INSET,
    });
  });

  it.each(['left', 'right'] as const)(
    'hides the order book column when collapsed while pinned %s',
    (orderBookPosition) => {
      const { getByTestId, queryByTestId } = renderLayout({
        isOrderBookCollapsed: true,
        orderBookPosition,
      });

      expect(
        queryByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLUMN),
      ).not.toBeOnTheScreen();
      expect(getByTestId('mock-order-form')).toBeOnTheScreen();
    },
  );
});
