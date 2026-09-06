import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { OrderDetailsShell } from './OrderDetailsShell';
import type { OrderItem } from '../../../../util/orders/types';

describe('OrderDetailsShell', () => {
  const mockOrder: OrderItem = {
    id: 'perps-order-1',
    domain: 'perps',
    orderType: 'limit',
    status: 'open',
    side: 'long',
    instrument: {
      symbol: 'ETH-PERP',
      name: 'Ethereum Perpetual',
      baseAssetSymbol: 'ETH',
      quoteAssetSymbol: 'USD',
      networkName: 'Arbitrum One',
    },
    size: '2.5',
    formattedSize: '2.5 ETH',
    price: '2500.00',
    formattedPrice: '$2,500.00',
    notionalValueUsd: '$6,250.00',
    timestamp: 1700000000000,
    canCancel: true,
    cancelType: 'offChain',
    canEdit: true,
    metadata: {
      leverage: '10x',
      marginMode: 'Cross',
      estLiquidationPrice: '$2,275.00',
    },
  };

  it('renders header, hero information, and domain detail rows', () => {
    const { getByText } = render(<OrderDetailsShell order={mockOrder} />);

    expect(getByText('Order Details')).toBeTruthy();
    expect(getByText('Ethereum Perpetual')).toBeTruthy();
    expect(getByText('LONG LIMIT')).toBeTruthy();
    expect(getByText('$2,500.00')).toBeTruthy();
    expect(getByText('2.5 ETH')).toBeTruthy();
    expect(getByText('10x')).toBeTruthy();
    expect(getByText('Cross')).toBeTruthy();
    expect(getByText('Arbitrum One')).toBeTruthy();
  });

  it('handles back button press', () => {
    const handleClose = jest.fn();
    const { getByTestId } = render(
      <OrderDetailsShell order={mockOrder} onClose={handleClose} />,
    );

    fireEvent.press(getByTestId('order-details-back-button'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('prompts confirmation when cancel button is tapped', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = render(<OrderDetailsShell order={mockOrder} />);

    fireEvent.press(getByTestId('order-details-cancel-button'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Cancel Order',
      expect.stringContaining('Are you sure you want to cancel'),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });
});
