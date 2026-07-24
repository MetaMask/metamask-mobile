import { render, screen } from '@testing-library/react-native';
import type { Order } from '@metamask/perps-controller';
import React from 'react';
import PerpsProOrderCard from './PerpsProOrderCard';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

describe('PerpsProOrderCard', () => {
  const order: Order = {
    orderId: 'order-1',
    symbol: 'SOL',
    side: 'sell',
    size: '13',
    originalSize: '13',
    filledSize: '0',
    remainingSize: '13',
    price: '160.71',
    triggerPrice: '101',
    takeProfitPrice: '220',
    stopLossPrice: '130',
    orderType: 'limit',
    detailedOrderType: 'Stop Market',
    status: 'open',
    timestamp: new Date(2026, 3, 6, 19, 13, 54).getTime(),
    reduceOnly: true,
    isTrigger: true,
  };

  it('renders the open order details and display-only cancel control', () => {
    render(<PerpsProOrderCard order={order} />);

    expect(screen.getByText('SOL')).toBeOnTheScreen();
    expect(screen.getByText('Long')).toBeOnTheScreen();
    expect(screen.getByText('Stop')).toBeOnTheScreen();
    expect(screen.getByText('13 SOL')).toBeOnTheScreen();
    expect(screen.getByText('$2,089.2')).toBeOnTheScreen();
    expect(screen.getByText('$160.71')).toBeOnTheScreen();
    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('$220 / $130')).toBeOnTheScreen();
    expect(screen.getByText('Price below $101')).toBeOnTheScreen();
    expect(screen.getByText('Cancel')).toBeOnTheScreen();
  });
});
