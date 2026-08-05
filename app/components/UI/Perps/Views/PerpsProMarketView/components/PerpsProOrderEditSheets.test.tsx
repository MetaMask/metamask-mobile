import type { Order } from '@metamask/perps-controller';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import PerpsProOrderEditSheets from './PerpsProOrderEditSheets';

jest.mock('./PerpsProPositionsModalPortal', () => {
  const { View } = jest.requireActual('react-native');
  return function PerpsProPositionsModalPortal({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <View testID="perps-order-edit-portal">{children}</View>;
  };
});

jest.mock(
  '../../../components/PerpsLimitPriceBottomSheet/PerpsLimitPriceBottomSheet',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return function PerpsLimitPriceBottomSheet({
      asset,
      limitPrice,
      direction,
    }: {
      asset: string;
      limitPrice: string;
      direction: string;
    }) {
      return (
        <View testID="perps-limit-price-bottom-sheet">
          <Text testID="limit-sheet-asset">{asset}</Text>
          <Text testID="limit-sheet-price">{limitPrice}</Text>
          <Text testID="limit-sheet-direction">{direction}</Text>
        </View>
      );
    };
  },
);

jest.mock(
  '../../../components/PerpsOrderSizeBottomSheet/PerpsOrderSizeBottomSheet',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return function PerpsOrderSizeBottomSheet({
      asset,
      orderSize,
      limitPrice,
      szDecimals,
      leverage,
      reduceOnly,
      isMarketDataReady,
    }: {
      asset: string;
      orderSize?: string;
      limitPrice?: string;
      szDecimals?: number;
      leverage?: number;
      reduceOnly?: boolean;
      isMarketDataReady?: boolean;
    }) {
      return (
        <View testID="perps-order-size-bottom-sheet">
          <Text testID="size-sheet-asset">{asset}</Text>
          <Text testID="size-sheet-size">{orderSize}</Text>
          <Text testID="size-sheet-price">{limitPrice}</Text>
          <Text testID="size-sheet-decimals">{String(szDecimals)}</Text>
          <Text testID="size-sheet-leverage">{String(leverage)}</Text>
          <Text testID="size-sheet-reduce-only">{String(reduceOnly)}</Text>
          <Text testID="size-sheet-market-ready">
            {String(isMarketDataReady)}
          </Text>
        </View>
      );
    };
  },
);

const editingOrder: Order = {
  orderId: 'order-1',
  symbol: 'SOL',
  side: 'buy',
  size: '1',
  originalSize: '1',
  filledSize: '0',
  remainingSize: '1',
  price: '160.71',
  orderType: 'limit',
  status: 'open',
  timestamp: 1_711_756_800_000,
  reduceOnly: false,
  isTrigger: false,
};

describe('PerpsProOrderEditSheets', () => {
  const onClose = jest.fn();
  const onConfirmPrice = jest.fn();
  const onConfirmSize = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when there is no editing order', () => {
    render(
      <PerpsProOrderEditSheets
        editingOrder={null}
        editingOrderSheet="price"
        editingOrderSzDecimals={3}
        editingOrderLeverage={25}
        isEditingOrderMarketDataReady
        onClose={onClose}
        onConfirmPrice={onConfirmPrice}
        onConfirmSize={onConfirmSize}
      />,
    );

    expect(
      screen.queryByTestId('perps-limit-price-bottom-sheet'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('perps-order-size-bottom-sheet'),
    ).not.toBeOnTheScreen();
  });

  it('renders nothing when no sheet field is selected', () => {
    render(
      <PerpsProOrderEditSheets
        editingOrder={editingOrder}
        editingOrderSheet={null}
        editingOrderSzDecimals={3}
        editingOrderLeverage={25}
        isEditingOrderMarketDataReady
        onClose={onClose}
        onConfirmPrice={onConfirmPrice}
        onConfirmSize={onConfirmSize}
      />,
    );

    expect(
      screen.queryByTestId('perps-limit-price-bottom-sheet'),
    ).not.toBeOnTheScreen();
  });

  it('renders the limit price sheet for a price edit', () => {
    render(
      <PerpsProOrderEditSheets
        editingOrder={editingOrder}
        editingOrderSheet="price"
        editingOrderSzDecimals={3}
        editingOrderLeverage={25}
        isEditingOrderMarketDataReady
        onClose={onClose}
        onConfirmPrice={onConfirmPrice}
        onConfirmSize={onConfirmSize}
      />,
    );

    expect(
      screen.getByTestId('perps-limit-price-bottom-sheet'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('limit-sheet-asset')).toHaveTextContent('SOL');
    expect(screen.getByTestId('limit-sheet-price')).toHaveTextContent('160.71');
    expect(screen.getByTestId('limit-sheet-direction')).toHaveTextContent(
      'long',
    );
  });

  it('renders the size sheet with market and order props', () => {
    render(
      <PerpsProOrderEditSheets
        editingOrder={{ ...editingOrder, reduceOnly: true }}
        editingOrderSheet="size"
        editingOrderSzDecimals={4}
        editingOrderLeverage={40}
        isEditingOrderMarketDataReady={false}
        onClose={onClose}
        onConfirmPrice={onConfirmPrice}
        onConfirmSize={onConfirmSize}
      />,
    );

    expect(
      screen.getByTestId('perps-order-size-bottom-sheet'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('size-sheet-asset')).toHaveTextContent('SOL');
    expect(screen.getByTestId('size-sheet-size')).toHaveTextContent('1');
    expect(screen.getByTestId('size-sheet-price')).toHaveTextContent('160.71');
    expect(screen.getByTestId('size-sheet-decimals')).toHaveTextContent('4');
    expect(screen.getByTestId('size-sheet-leverage')).toHaveTextContent('40');
    expect(screen.getByTestId('size-sheet-reduce-only')).toHaveTextContent(
      'true',
    );
    expect(screen.getByTestId('size-sheet-market-ready')).toHaveTextContent(
      'false',
    );
  });
});
