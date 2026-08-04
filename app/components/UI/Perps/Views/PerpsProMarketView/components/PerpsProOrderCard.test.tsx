import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Order } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProOrderCard from './PerpsProOrderCard';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

describe('PerpsProOrderCard', () => {
  const DOTS_SHORT = '•'.repeat(6);
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(false);
  });

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
    expect(screen.getByText('Stop market')).toBeOnTheScreen();
    expect(screen.getByText('13 SOL')).toBeOnTheScreen();
    // Trigger orders resolve display price from triggerPrice via
    // resolveOrderDisplayPriceAndLabel ($101), not the leftover order price.
    expect(screen.getByText('$1,313')).toBeOnTheScreen();
    expect(screen.getByText('$101')).toBeOnTheScreen();
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

  it('does not show trigger condition for non-trigger limit orders that carry a triggerPrice', () => {
    render(
      <PerpsProOrderCard
        order={{
          ...baseOrder,
          isTrigger: false,
          detailedOrderType: 'Limit',
          orderType: 'limit',
          triggerPrice: '51000',
          price: '160.71',
        }}
      />,
    );

    expect(screen.getByText('$160.71')).toBeOnTheScreen();
    expect(screen.queryByText(/Price (above|below)/)).toBeNull();
    expect(screen.getByText('$---')).toBeOnTheScreen();
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
      typeLabel: 'Limit',
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
      typeLabel: 'Limit',
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
      typeLabel: 'Limit',
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
      typeLabel: 'Take profit limit',
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
      typeLabel: 'Stop limit',
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
      typeLabel: 'Stop market',
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

  it('invokes the market switch handler when the card is pressed', () => {
    const onPress = jest.fn();

    render(<PerpsProOrderCard order={baseOrder} onPress={onPress} />);

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_ROW),
    );

    expect(onPress).toHaveBeenCalledWith(baseOrder);
  });

  it('exposes the market switch as a labelled action for screen readers', () => {
    render(<PerpsProOrderCard order={baseOrder} onPress={jest.fn()} />);

    expect(screen.getByLabelText('Switch to the SOL market')).toBeOnTheScreen();
  });

  it('keeps cancel scoped to its own handler when the card is pressable', () => {
    const onPress = jest.fn();
    const onCancel = jest.fn();

    render(
      <PerpsProOrderCard
        order={baseOrder}
        onPress={onPress}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_CANCEL),
    );

    expect(onCancel).toHaveBeenCalledWith(baseOrder);
    expect(onPress).not.toHaveBeenCalled();
  });

  describe('Privacy Mode', () => {
    it('hides monetary values but keeps size and labels visible', () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      render(
        <PerpsProOrderCard
          order={{
            ...baseOrder,
            takeProfitPrice: '220',
            stopLossPrice: '130',
          }}
        />,
      );

      expect(screen.getByText('13 SOL')).toBeOnTheScreen();
      expect(screen.getByText('Limit')).toBeOnTheScreen();
      expect(screen.getByText('SOL')).toBeOnTheScreen();
      expect(screen.queryByText('$160.71')).toBeNull();
      expect(screen.queryByText('$220 / $130')).toBeNull();
      expect(screen.getAllByText(DOTS_SHORT).length).toBeGreaterThanOrEqual(2);
    });
  });
});
