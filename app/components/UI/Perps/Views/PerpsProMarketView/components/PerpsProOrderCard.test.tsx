import { render, screen } from '@testing-library/react-native';
import type { Order } from '@metamask/perps-controller';
import React from 'react';
import PerpsProOrderCard from './PerpsProOrderCard';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

describe('PerpsProOrderCard', () => {
  const baseOrder: Order = {
    orderId: 'order-1',
    symbol: 'SOL',
    side: 'sell',
    size: '13',
    originalSize: '13',
    filledSize: '0',
    remainingSize: '13',
    price: '160.71',
    orderType: 'limit',
    status: 'open',
    timestamp: new Date(2026, 3, 6, 19, 13, 54).getTime(),
    reduceOnly: false,
    isTrigger: false,
  };

  it('renders stop order details and display-only cancel control', () => {
    render(
      <PerpsProOrderCard
        order={{
          ...baseOrder,
          triggerPrice: '101',
          takeProfitPrice: '220',
          stopLossPrice: '130',
          detailedOrderType: 'Stop Market',
          reduceOnly: true,
          isTrigger: true,
        }}
      />,
    );

    expect(screen.getByText('SOL')).toBeOnTheScreen();
    expect(screen.getByText('Long')).toBeOnTheScreen();
    expect(screen.getByText('Stop')).toBeOnTheScreen();
    expect(screen.getByText('13 SOL')).toBeOnTheScreen();
    expect(screen.getByText('$2,089.2')).toBeOnTheScreen();
    expect(screen.getByText('$160.71')).toBeOnTheScreen();
    expect(screen.getByText('Yes')).toBeOnTheScreen();
    expect(screen.getByText('$220 / $130')).toBeOnTheScreen();
    expect(screen.getByText('Price below $101.00')).toBeOnTheScreen();
    expect(screen.getByText('Cancel')).toBeOnTheScreen();
  });

  it('shows Price above for take-profit sell triggers', () => {
    render(
      <PerpsProOrderCard
        order={{
          ...baseOrder,
          side: 'sell',
          detailedOrderType: 'Take Profit Market',
          orderType: 'market',
          reduceOnly: true,
          isTrigger: true,
          triggerPrice: '220',
          price: '0',
        }}
      />,
    );

    expect(screen.getByText('Price above $220.00')).toBeOnTheScreen();
  });

  it.each([
    {
      name: 'open limit',
      order: {
        ...baseOrder,
        side: 'buy' as const,
        detailedOrderType: 'Limit',
        orderType: 'limit' as const,
        reduceOnly: false,
      },
      typeLabel: 'Open limit',
      directionLabel: 'Long',
      reduceOnlyLabel: 'No',
    },
    {
      name: 'close limit',
      order: {
        ...baseOrder,
        side: 'sell' as const,
        detailedOrderType: 'Limit',
        orderType: 'limit' as const,
        reduceOnly: true,
        isTrigger: false,
      },
      typeLabel: 'Close limit',
      directionLabel: 'Long',
      reduceOnlyLabel: 'Yes',
    },
    {
      name: 'close limit short',
      order: {
        ...baseOrder,
        side: 'buy' as const,
        detailedOrderType: 'Limit',
        orderType: 'limit' as const,
        reduceOnly: true,
        isTrigger: false,
      },
      typeLabel: 'Close limit',
      directionLabel: 'Short',
      reduceOnlyLabel: 'Yes',
    },
    {
      name: 'open market',
      order: {
        ...baseOrder,
        side: 'sell' as const,
        detailedOrderType: 'Market',
        orderType: 'market' as const,
        reduceOnly: false,
      },
      typeLabel: 'Market',
      directionLabel: 'Short',
      reduceOnlyLabel: 'No',
    },
    {
      name: 'take profit limit',
      order: {
        ...baseOrder,
        side: 'sell' as const,
        detailedOrderType: 'Take Profit Limit',
        orderType: 'limit' as const,
        reduceOnly: true,
        isTrigger: true,
        triggerPrice: '220',
      },
      typeLabel: 'Take profit',
      directionLabel: 'Long',
      reduceOnlyLabel: 'Yes',
    },
    {
      name: 'stop limit',
      order: {
        ...baseOrder,
        side: 'sell' as const,
        detailedOrderType: 'Stop Limit',
        orderType: 'limit' as const,
        reduceOnly: true,
        isTrigger: true,
        triggerPrice: '101',
      },
      typeLabel: 'Stop',
      directionLabel: 'Long',
      reduceOnlyLabel: 'Yes',
    },
    {
      name: 'stop market',
      order: {
        ...baseOrder,
        side: 'buy' as const,
        detailedOrderType: 'Stop Market',
        orderType: 'market' as const,
        reduceOnly: true,
        isTrigger: true,
        triggerPrice: '101',
      },
      typeLabel: 'Stop',
      directionLabel: 'Short',
      reduceOnlyLabel: 'Yes',
    },
  ])(
    'labels $name orders with type "$typeLabel" and direction "$directionLabel"',
    ({ order, typeLabel, directionLabel, reduceOnlyLabel }) => {
      render(<PerpsProOrderCard order={order} />);

      expect(screen.getByText(typeLabel)).toBeOnTheScreen();
      expect(screen.getByText(directionLabel)).toBeOnTheScreen();
      expect(screen.getByText(reduceOnlyLabel)).toBeOnTheScreen();
    },
  );
});
