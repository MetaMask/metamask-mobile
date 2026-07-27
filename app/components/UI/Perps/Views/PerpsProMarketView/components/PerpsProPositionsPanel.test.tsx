import { fireEvent, screen } from '@testing-library/react-native';
import type { Order, Position } from '@metamask/perps-controller';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import {
  usePerpsLiveOrders,
  usePerpsLivePositions,
} from '../../../hooks/stream';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProPositionsPanel from './PerpsProPositionsPanel';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

jest.mock('../../../hooks/stream', () => ({
  usePerpsLiveOrders: jest.fn(),
  usePerpsLivePositions: jest.fn(),
}));

const mockUsePerpsLiveOrders = jest.mocked(usePerpsLiveOrders);
const mockUsePerpsLivePositions = jest.mocked(usePerpsLivePositions);

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  symbol: 'BTC',
  size: '1',
  entryPrice: '50000',
  positionValue: '51000',
  unrealizedPnl: '1000',
  marginUsed: '10000',
  leverage: { type: 'cross', value: 5 },
  liquidationPrice: '40000',
  maxLeverage: 50,
  returnOnEquity: '0.10',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: 'order-1',
  symbol: 'BTC',
  side: 'buy',
  size: '1',
  originalSize: '1',
  filledSize: '0',
  remainingSize: '1',
  price: '50000',
  orderType: 'limit',
  status: 'open',
  timestamp: Date.now(),
  reduceOnly: false,
  isTrigger: false,
  detailedOrderType: 'Limit',
  ...overrides,
});

const renderPanel = (symbol = 'SOL') =>
  renderWithProvider(<PerpsProPositionsPanel symbol={symbol} />, {
    state: { engine: { backgroundState } },
  });

const expectTabLabel = (label: string) => {
  expect(screen.getAllByText(label).length).toBeGreaterThan(0);
};

describe('PerpsProPositionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLiveOrders>);
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);
  });

  it('shows the global empty state when there are no positions', () => {
    renderPanel();

    expect(
      screen.getByText('Your open positions will appear here.'),
    ).toBeOnTheScreen();
    expectTabLabel('Positions');
  });

  it('shows open position count and list when positions exist', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition(), makePosition({ symbol: 'ETH' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel();

    expectTabLabel('Positions (2)');
    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_LIST),
    ).toBeOnTheScreen();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('ETH')).toBeOnTheScreen();
  });

  it('uses filtered count and filtered empty copy for ticker-only with no match', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'BTC' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    expectTabLabel('Positions (1)');

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY),
    );

    expectTabLabel('Positions');
    expect(screen.queryAllByText('Positions (1)')).toHaveLength(0);
    expect(screen.getByText('No open SOL positions.')).toBeOnTheScreen();
    expect(
      screen.queryByText('Your open positions will appear here.'),
    ).toBeNull();
  });

  it('filters the positions list to the current ticker when enabled', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC' }),
        makePosition({ symbol: 'SOL', unrealizedPnl: '50' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY),
    );

    expectTabLabel('Positions (1)');
    expect(screen.getByText('SOL')).toBeOnTheScreen();
    expect(screen.queryByText('BTC')).toBeNull();
  });

  it('derives summary P&L from the same visiblePositions used by the cards', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC', unrealizedPnl: '1000' }),
        makePosition({ symbol: 'SOL', unrealizedPnl: '50' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    // Aggregate of all live-enriched positions (not an account-stream total).
    expect(screen.getByText('+$1,050.00 (+10.0%)')).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY),
    );

    // Aggregate of the filtered subset only (card may show the same amount).
    expect(screen.getAllByText('+$50.00 (+10.0%)').length).toBeGreaterThan(0);
    expect(screen.queryByText('+$1,050.00 (+10.0%)')).toBeNull();
  });

  it('does not filter orders when ticker-only is enabled on the positions tab', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'BTC' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [
        makeOrder({ orderId: 'btc-1', symbol: 'BTC' }),
        makeOrder({ orderId: 'sol-1', symbol: 'SOL' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLiveOrders>);

    renderPanel('SOL');

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY),
    );
    fireEvent.press(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
      ),
    );

    expectTabLabel('Orders (2)');
    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDERS_LIST),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('BTC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SOL').length).toBeGreaterThan(0);
  });
});
