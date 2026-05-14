/**
 * Component view tests for PerpsMarketTabs.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type {
  AccountState,
  Order,
  PerpsMarketData,
  Position,
} from '@metamask/perps-controller';
import {
  defaultOrderForViews,
  defaultPositionForViews,
  renderPerpsComponent,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsMarketTabsSelectorsIDs,
  PerpsOpenOrderCardSelectorsIDs,
} from '../../Perps.testIds';
import PerpsMarketTabs from './PerpsMarketTabs';

const TIMEOUT_MS = 5000;

const eligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
      },
    },
  },
};

const fundedAccount = (balance: string): AccountState => ({
  spendableBalance: balance,
  withdrawableBalance: balance,
  totalBalance: balance,
  marginUsed: '0',
  unrealizedPnl: '0',
  returnOnEquity: '0',
});

const ethMarket: PerpsMarketData = {
  symbol: 'ETH',
  name: 'Ethereum',
  maxLeverage: '50x',
  price: '$2,500.00',
  change24h: '+$50.00',
  change24hPercent: '+2.0%',
  volume: '$1.5B',
  marketType: 'crypto',
};

const longPosition: Position = {
  ...defaultPositionForViews,
  symbol: 'ETH',
  size: '1',
  marginUsed: '833.33',
  entryPrice: '2500',
  liquidationPrice: '1800',
  unrealizedPnl: '0',
  returnOnEquity: '0',
  leverage: { value: 3, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '0', allTime: '0', sinceChange: '0' },
  positionValue: '2500',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

const limitLongOrder: Order = {
  ...defaultOrderForViews,
  orderId: 'limit-eth-mid',
  symbol: 'ETH',
  side: 'buy',
  orderType: 'limit',
  detailedOrderType: 'Limit',
  price: '2500',
  size: '0.1',
  originalSize: '0.1',
  filledSize: '0',
  remainingSize: '0.1',
  reduceOnly: false,
  status: 'open',
  timestamp: Date.now(),
};

describe('PerpsMarketTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an ETH limit long order, then moves it into a position after the fill stream update', async () => {
    const onOrderSelect = jest.fn();

    const { stream } = renderPerpsComponent(
      PerpsMarketTabs as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      {
        symbol: 'ETH',
        initialTab: 'orders',
        onOrderSelect,
      },
      {
        overrides: eligibleOverrides,
        streamOverrides: {
          account: fundedAccount('10000'),
          positions: [],
          orders: [limitLongOrder],
          marketData: [ethMarket],
        },
      },
    );

    expect(
      await screen.findByTestId(
        PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Limit Long')).toBeOnTheScreen();

    const orderCard = screen.getByTestId(PerpsOpenOrderCardSelectorsIDs.CARD);
    fireEvent.press(orderCard);
    expect(onOrderSelect).toHaveBeenCalledWith('limit-eth-mid');

    act(() => {
      stream.emitOrders([]);
      stream.emitPositions([
        {
          ...longPosition,
          unrealizedPnl: '-37.50',
          returnOnEquity: '-0.045',
        },
      ]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsOpenOrderCardSelectorsIDs.CARD),
      ).not.toBeOnTheScreen();
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
    ).toBeOnTheScreen();
  });
});
