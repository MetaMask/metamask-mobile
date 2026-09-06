import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { OrderDetailsView } from './OrderDetailsView';
import type { OrderItem } from '../../../util/orders/types';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

let mockRouteParams: { orderId?: string; order?: OrderItem } = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

describe('OrderDetailsView', () => {
  const sampleOrder: OrderItem = {
    id: 'test-swap-order',
    domain: 'swap',
    orderType: 'limit',
    status: 'open',
    side: 'buy',
    instrument: {
      symbol: 'ETH/USDC',
      name: 'Ethereum',
      baseAssetSymbol: 'ETH',
      quoteAssetSymbol: 'USDC',
      networkName: 'Ethereum Mainnet',
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { order: sampleOrder };
  });

  it('renders order details correctly with hero, badges, and metadata rows', () => {
    const { getByText, getByTestId } = render(<OrderDetailsView />);

    expect(getByText('Order Details')).toBeTruthy();
    expect(getByText('Ethereum')).toBeTruthy();
    expect(getByText('$2,450.00')).toBeTruthy();
    expect(getByText('BUY LIMIT')).toBeTruthy();
    expect(getByText('SWAP')).toBeTruthy();
    expect(getByText('OPEN')).toBeTruthy();
    expect(getByTestId('order-details-hero')).toBeTruthy();
    expect(getByTestId('order-details-metadata')).toBeTruthy();
  });

  it('navigates back when header back button is pressed', () => {
    const { getByTestId } = render(<OrderDetailsView />);

    fireEvent.press(getByTestId('order-details-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows partial fill progress when order is partially filled', () => {
    mockRouteParams = {
      order: {
        ...sampleOrder,
        status: 'partiallyFilled',
        filledSize: '0.6 ETH',
        fillPercentage: 40,
      },
    };

    const { getByText, getByTestId } = render(<OrderDetailsView />);

    expect(getByTestId('order-details-fill-progress')).toBeTruthy();
    expect(getByText('Partial Fill Progress')).toBeTruthy();
    expect(getByText('40%')).toBeTruthy();
  });

  it('handles cancel order confirmation and dismisses screen', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = render(<OrderDetailsView />);

    const cancelButton = getByTestId('order-details-cancel-button');
    fireEvent.press(cancelButton);

    expect(alertSpy).toHaveBeenCalledWith(
      'Cancel Order',
      expect.stringContaining('Are you sure you want to cancel'),
      expect.any(Array),
    );

    // Trigger confirmation onPress
    const alertButtons = alertSpy.mock.calls[0][2];
    const destructiveButton = alertButtons?.find(
      (b) => b.style === 'destructive',
    );
    destructiveButton?.onPress?.();

    alertSpy.mockRestore();
  });

  it('renders not found state when no order is provided', () => {
    mockRouteParams = {};

    const { getByTestId, getByText } = render(<OrderDetailsView />);

    expect(getByTestId('order-details-not-found')).toBeTruthy();
    expect(getByText('Order not found.')).toBeTruthy();
  });
});
