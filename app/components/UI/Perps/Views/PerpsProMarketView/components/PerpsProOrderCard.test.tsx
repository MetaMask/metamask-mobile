import { TagSeverity } from '@metamask/design-system-react-native';
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

// Tag maps severity into styles and does not forward it. Preserve severity on the
// host so direction-tag assertions can verify the semantic color contract.
jest.mock('@metamask/design-system-react-native', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  interface MockTagProps {
    children?: React.ReactNode;
    severity?: string;
    testID?: string;
  }

  // Test double host: widen View's props only for this mock so severity remains
  // queryable without using `any` or inventing unsupported View attributes.
  const MockTagHost = View as React.ComponentType<MockTagProps>;

  return {
    ...actual,
    Tag: ({ children, severity, testID }: MockTagProps) =>
      ReactLocal.createElement(
        MockTagHost,
        { testID, severity },
        typeof children === 'string' || typeof children === 'number'
          ? ReactLocal.createElement(Text, null, children)
          : children,
      ),
  };
});

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
    expect(screen.getByText('Close long')).toBeOnTheScreen();
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

  it('shows edit affordance for editable limit orders', () => {
    render(<PerpsProOrderCard order={baseOrder} onEditPrice={jest.fn()} />);

    expect(screen.getByText('Edit')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_EDIT),
    ).toBeOnTheScreen();
  });

  it('shows size edit affordance when size handler is provided', () => {
    render(<PerpsProOrderCard order={baseOrder} onEditSize={jest.fn()} />);

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_SIZE_EDIT),
    ).toBeOnTheScreen();
  });

  it('hides edit affordance when edit handler is omitted', () => {
    render(<PerpsProOrderCard order={baseOrder} />);

    expect(
      screen.queryByTestId(PerpsProMarketViewSelectorsIDs.ORDER_EDIT),
    ).not.toBeOnTheScreen();
  });

  it('hides edit button when price edit is disabled (panel wiring)', () => {
    // Production panel always supplies onEditPrice and toggles
    // isEditPriceDisabled — ineligible orders must show no Edit affordance.
    render(
      <PerpsProOrderCard
        order={baseOrder}
        onEditPrice={jest.fn()}
        isEditPriceDisabled
      />,
    );

    expect(
      screen.queryByTestId(PerpsProMarketViewSelectorsIDs.ORDER_EDIT),
    ).not.toBeOnTheScreen();
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
      reduceOnlyLabel: 'Yes',
    },
  ])(
    'labels $name orders with type "$typeLabel" and reduce-only "$reduceOnlyLabel"',
    ({ order, typeLabel, reduceOnlyLabel }) => {
      render(<PerpsProOrderCard order={order} />);

      expect(screen.getByText(typeLabel)).toBeOnTheScreen();
      expect(screen.getByText(reduceOnlyLabel)).toBeOnTheScreen();
    },
  );

  it.each([
    {
      name: 'opening buy',
      order: {
        ...baseOrder,
        side: 'buy' as const,
        detailedOrderType: 'Limit',
        orderType: 'limit' as const,
        reduceOnly: false,
        isTrigger: false,
      },
      directionLabel: 'Long',
      severity: TagSeverity.Success,
    },
    {
      name: 'opening sell',
      order: {
        ...baseOrder,
        side: 'sell' as const,
        detailedOrderType: 'Market',
        orderType: 'market' as const,
        reduceOnly: false,
        isTrigger: false,
      },
      directionLabel: 'Short',
      severity: TagSeverity.Danger,
    },
    {
      name: 'trigger-only sell',
      order: {
        ...baseOrder,
        side: 'sell' as const,
        detailedOrderType: 'Take Profit Market',
        orderType: 'market' as const,
        reduceOnly: false,
        isTrigger: true,
        triggerPrice: '220',
      },
      directionLabel: 'Close long',
      severity: TagSeverity.Danger,
    },
    {
      name: 'reduce-only sell',
      order: {
        ...baseOrder,
        side: 'sell' as const,
        detailedOrderType: 'Limit',
        orderType: 'limit' as const,
        reduceOnly: true,
        isTrigger: false,
      },
      directionLabel: 'Close long',
      severity: TagSeverity.Danger,
    },
    {
      name: 'trigger-only buy',
      order: {
        ...baseOrder,
        side: 'buy' as const,
        detailedOrderType: 'Stop Market',
        orderType: 'market' as const,
        reduceOnly: false,
        isTrigger: true,
        triggerPrice: '101',
      },
      directionLabel: 'Close short',
      severity: TagSeverity.Success,
    },
    {
      name: 'reduce-only buy',
      order: {
        ...baseOrder,
        side: 'buy' as const,
        detailedOrderType: 'Limit',
        orderType: 'limit' as const,
        reduceOnly: true,
        isTrigger: false,
      },
      directionLabel: 'Close short',
      severity: TagSeverity.Success,
    },
  ] as const)(
    'renders $name direction tag as "$directionLabel" with $severity severity',
    ({ order, directionLabel, severity }) => {
      render(<PerpsProOrderCard order={order} />);

      const directionTag = screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.ORDER_DIRECTION_TAG,
      );

      expect(screen.getByText(directionLabel)).toBeOnTheScreen();
      expect(directionTag).toHaveProp('severity', severity);
    },
  );

  it('exposes the order type pill via testID', () => {
    render(
      <PerpsProOrderCard
        order={{
          ...baseOrder,
          detailedOrderType: 'Stop Market',
          orderType: 'market',
          isTrigger: true,
        }}
      />,
    );

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_TYPE),
    ).toHaveTextContent('Stop market');
  });

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
