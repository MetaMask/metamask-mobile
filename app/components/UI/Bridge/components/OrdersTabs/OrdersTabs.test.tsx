import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { initialState } from '../../_mocks_/initialState';
import OrdersTabs from './OrdersTabs';
import { OrdersTabsSelectorsIDs } from './OrdersTabs.testIds';
import type { OrdersTabsProps } from './OrdersTabs.types';

jest.mock('@shopify/flash-list', () =>
  require('../../../../../util/test/mockFlashList').flashListMock(),
);

function renderOrdersTabs<TOpen, THistory>(
  props: OrdersTabsProps<TOpen, THistory>,
) {
  return renderWithProvider(<OrdersTabs {...props} />, {
    state: initialState,
  });
}

describe('OrdersTabs', () => {
  it('shows open orders empty copy then history empty copy after pressing History', () => {
    const { getByTestId, getByText, queryByText } = renderOrdersTabs({
      openOrders: { items: [] },
      history: { items: [] },
    });

    expect(getByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.orders.empty.open_orders')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB));

    expect(getByText(strings('bridge.orders.empty.history'))).toBeOnTheScreen();
    expect(queryByText(strings('bridge.orders.empty.open_orders'))).toBeNull();
  });

  it('renders feature-specific open order and history items from distinct data shapes', () => {
    const { getByTestId, queryByTestId } = renderOrdersTabs({
      openOrders: {
        items: [{ id: 'limit-1', price: '2500' }],
        renderItem: (item) => (
          <Text testID="limit-open-order">{item.price}</Text>
        ),
        keyExtractor: (item) => item.id,
      },
      history: {
        items: [{ hash: '0xabc', executedAt: 1_700_000_000 }],
        renderItem: (item) => (
          <Text testID="recurring-history">{item.hash}</Text>
        ),
        keyExtractor: (item) => item.hash,
      },
    });

    expect(getByTestId('limit-open-order')).toHaveTextContent('2500');
    expect(queryByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeNull();
    expect(queryByTestId('recurring-history')).toBeNull();

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB));

    expect(getByTestId('recurring-history')).toHaveTextContent('0xabc');
    expect(queryByTestId('limit-open-order')).toBeNull();
    expect(queryByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeNull();
  });
});
