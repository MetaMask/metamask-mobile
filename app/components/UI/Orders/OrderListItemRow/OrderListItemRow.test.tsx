import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderListItemRow } from './OrderListItemRow';
import type { OrderItem } from '../../../../util/orders/types';

describe('OrderListItemRow', () => {
  const mockOrder: OrderItem = {
    id: 'test-order-1',
    domain: 'swap',
    orderType: 'limit',
    status: 'open',
    side: 'buy',
    instrument: {
      symbol: 'ETH/USDC',
      baseAssetSymbol: 'ETH',
      quoteAssetSymbol: 'USDC',
    },
    size: '1.5',
    formattedSize: '1.5 ETH',
    price: '2450.00',
    formattedPrice: '$2,450.00',
    notionalValueUsd: '$3,675.00',
    timestamp: 1700000000000,
    canCancel: true,
    cancelType: 'offChain',
    canEdit: true,
  };

  it('renders order symbol, side, type, and price correctly', () => {
    const { getByText } = render(<OrderListItemRow order={mockOrder} />);

    expect(getByText('ETH/USDC')).toBeTruthy();
    expect(getByText('BUY LIMIT')).toBeTruthy();
    expect(getByText('$2,450.00')).toBeTruthy();
    expect(getByText('1.5 ETH')).toBeTruthy();
    expect(getByText('Swaps Limit')).toBeTruthy();
  });

  it('triggers onPress callback when pressed', () => {
    const handlePress = jest.fn();
    const { getByTestId } = render(
      <OrderListItemRow order={mockOrder} onPress={handlePress} />,
    );

    fireEvent.press(getByTestId('order-row-test-order-1'));
    expect(handlePress).toHaveBeenCalledWith(mockOrder);
  });

  it('displays partial fill progress when partially filled', () => {
    const partialOrder: OrderItem = {
      ...mockOrder,
      status: 'partiallyFilled',
      filledSize: '0.6 ETH',
      fillPercentage: 40,
    };

    const { getByText } = render(<OrderListItemRow order={partialOrder} />);
    expect(getByText('Filled: 0.6 ETH (40%)')).toBeTruthy();
  });
});
