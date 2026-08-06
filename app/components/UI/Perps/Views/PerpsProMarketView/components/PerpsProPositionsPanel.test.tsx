import { fireEvent, screen } from '@testing-library/react-native';
import type {
  Order,
  PerpsMarketData,
  Position,
} from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import {
  usePerpsLiveOrders,
  usePerpsLivePositions,
} from '../../../hooks/stream';
import { usePerpsProPositionsPanelActions } from '../../../hooks/usePerpsProPositionsPanelActions';
import { usePerpsMarkets } from '../../../hooks/usePerpsMarkets';
import {
  getPerpsProOrderRowSelector,
  getPerpsProPositionRowSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import PerpsProPositionsPanel from './PerpsProPositionsPanel';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

jest.mock('../../../hooks/stream', () => ({
  usePerpsLiveOrders: jest.fn(),
  usePerpsLivePositions: jest.fn(),
}));

jest.mock('../../../hooks/usePerpsProPositionsPanelActions', () => ({
  usePerpsProPositionsPanelActions: jest.fn(),
}));

jest.mock('../../../hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: jest.fn(),
}));

const mockUsePerpsLiveOrders = jest.mocked(usePerpsLiveOrders);
const mockUsePerpsLivePositions = jest.mocked(usePerpsLivePositions);
const mockUsePerpsProPositionsPanelActions = jest.mocked(
  usePerpsProPositionsPanelActions,
);
const mockUsePerpsMarkets = jest.mocked(usePerpsMarkets);

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
  timestamp: 1_711_756_800_000, // 2024-03-30T00:00:00.000Z — fixed for determinism
  reduceOnly: false,
  isTrigger: false,
  detailedOrderType: 'Limit',
  ...overrides,
});

const renderPanel = (
  symbol = 'SOL',
  onSelectMarket?: (
    market: Partial<PerpsMarketData>,
    sourceSection: 'positions' | 'orders',
  ) => void,
) =>
  renderWithProvider(
    <PerpsProPositionsPanel symbol={symbol} onSelectMarket={onSelectMarket} />,
    {
      state: { engine: { backgroundState } },
    },
  );

const expectTabLabel = (label: string) => {
  expect(screen.getAllByText(label).length).toBeGreaterThan(0);
};

const openSideFilterSheet = () => {
  fireEvent.press(
    screen.getByTestId(
      PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_BUTTON,
    ),
  );
};

const applySideFilter = (side: 'all' | 'long' | 'short') => {
  openSideFilterSheet();
  fireEvent.press(
    screen.getByTestId(
      `${PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_SHEET}-option-${side}`,
    ),
  );
  fireEvent.press(
    screen.getByTestId(
      `${PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_SHEET}-apply`,
    ),
  );
};

const applySortByFundingRate = () => {
  fireEvent.press(
    screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_SORT_BUTTON),
  );
  fireEvent.press(
    screen.getByTestId(
      `${PerpsProMarketViewSelectorsIDs.POSITIONS_SORT_SHEET}-option-fundingRate`,
    ),
  );
  fireEvent.press(
    screen.getByTestId(
      `${PerpsProMarketViewSelectorsIDs.POSITIONS_SORT_SHEET}-apply`,
    ),
  );
};

describe('PerpsProPositionsPanel', () => {
  const handleClosePosition = jest.fn();
  const handleReversePosition = jest.fn();
  const handleSharePosition = jest.fn();
  const handleCancelOrder = jest.fn();
  const handleCloseAllPress = jest.fn();

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
    mockUsePerpsProPositionsPanelActions.mockReturnValue({
      handleClosePosition,
      handleReversePosition,
      handleSharePosition,
      handleEditPositionTpSl: jest.fn(),
      handleEditPositionMargin: jest.fn(),
      handleCancelOrder,
      handleEditOrderPrice: jest.fn(),
      handleEditOrderSize: jest.fn(),
      handleCloseAllPress,
      cancelingOrderId: null,
      editingOrderId: null,
      isOrderCancelable: () => true,
      isOrderEditable: () => true,
      isOrderSizeEditable: () => true,
      isPositionMarginEditable: () => true,
      renderActionSheets: () => null,
    });
    mockUsePerpsMarkets.mockReturnValue({
      markets: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });
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

  it('wires close-all and position action handlers when data is present', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'SOL' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_CLOSE_ALL),
    );
    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_CLOSE),
    );

    expect(handleCloseAllPress).toHaveBeenCalled();
    expect(handleClosePosition).toHaveBeenCalled();
  });

  it('wires order cancel handler on the orders tab', () => {
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [makeOrder({ orderId: 'sol-1', symbol: 'SOL' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLiveOrders>);

    renderPanel('SOL');

    fireEvent.press(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
      ),
    );
    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_CANCEL),
    );

    expect(handleCancelOrder).toHaveBeenCalled();
  });

  it('disables all order cancel buttons while any cancel is in flight', () => {
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [
        makeOrder({ orderId: 'btc-1', symbol: 'BTC' }),
        makeOrder({ orderId: 'sol-1', symbol: 'SOL' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLiveOrders>);
    mockUsePerpsProPositionsPanelActions.mockReturnValue({
      handleClosePosition,
      handleReversePosition,
      handleSharePosition,
      handleEditPositionTpSl: jest.fn(),
      handleEditPositionMargin: jest.fn(),
      handleCancelOrder,
      handleEditOrderPrice: jest.fn(),
      handleEditOrderSize: jest.fn(),
      handleCloseAllPress,
      cancelingOrderId: 'btc-1',
      editingOrderId: null,
      isOrderCancelable: () => true,
      isOrderEditable: () => true,
      isOrderSizeEditable: () => true,
      isPositionMarginEditable: () => true,
      renderActionSheets: () => null,
    });

    renderPanel('SOL');

    fireEvent.press(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
      ),
    );

    const cancelButtons = screen.getAllByTestId(
      PerpsProMarketViewSelectorsIDs.ORDER_CANCEL,
    );

    expect(cancelButtons).toHaveLength(2);
    cancelButtons.forEach((button) => {
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('switches to the full market data of a tapped position row', () => {
    const onSelectMarket = jest.fn();
    const ethMarket = { symbol: 'ETH', maxLeverage: '25x' };
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'ETH' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);
    mockUsePerpsMarkets.mockReturnValue({
      markets: [ethMarket],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    } as unknown as ReturnType<typeof usePerpsMarkets>);

    renderPanel('SOL', onSelectMarket);

    fireEvent.press(screen.getByTestId(getPerpsProPositionRowSelector('ETH')));

    expect(onSelectMarket).toHaveBeenCalledWith(
      ethMarket,
      PERPS_EVENT_VALUE.SOURCE_SECTION.POSITIONS,
    );
  });

  it('falls back to a symbol-only market when the row asset is not in the market list', () => {
    const onSelectMarket = jest.fn();
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'ETH' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL', onSelectMarket);

    fireEvent.press(screen.getByTestId(getPerpsProPositionRowSelector('ETH')));

    expect(onSelectMarket).toHaveBeenCalledWith(
      { symbol: 'ETH' },
      PERPS_EVENT_VALUE.SOURCE_SECTION.POSITIONS,
    );
  });

  it('switches to the market of a tapped order row', () => {
    const onSelectMarket = jest.fn();
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [makeOrder({ orderId: 'eth-1', symbol: 'ETH' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLiveOrders>);

    renderPanel('SOL', onSelectMarket);

    fireEvent.press(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
      ),
    );
    fireEvent.press(screen.getByTestId(getPerpsProOrderRowSelector('ETH', 0)));

    expect(onSelectMarket).toHaveBeenCalledWith(
      { symbol: 'ETH' },
      PERPS_EVENT_VALUE.SOURCE_SECTION.ORDERS,
    );
  });

  it('leaves rows non-interactive when no market switch handler is provided', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'ETH' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    expect(screen.queryByLabelText('Switch to the ETH market')).toBeNull();
  });

  it('matches the ticker-only filter on the full market symbol for HIP-3 markets', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'dex1:SOL' }),
        makePosition({ symbol: 'SOL' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('dex1:SOL');

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY),
    );

    expectTabLabel('Positions (1)');
    expect(
      screen.getByTestId('perps-pro-market-position-row-dex1:SOL'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('perps-pro-market-position-row-SOL'),
    ).toBeNull();
  });

  it('subscribes to market data for funding-rate sort', () => {
    renderPanel();

    expect(mockUsePerpsMarkets).toHaveBeenCalled();
    expect(mockUsePerpsMarkets.mock.calls[0]?.[0]?.skipInitialFetch).not.toBe(
      true,
    );
  });

  it('sorts positions by market funding rate when configured', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC' }),
        makePosition({ symbol: 'ETH' }),
        makePosition({ symbol: 'SOL' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);
    mockUsePerpsMarkets.mockReturnValue({
      markets: [
        { symbol: 'BTC', fundingRate: 0.015 },
        { symbol: 'ETH', fundingRate: -0.005 },
        { symbol: 'SOL', fundingRate: 0.0025 },
      ],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    } as unknown as ReturnType<typeof usePerpsMarkets>);

    renderPanel('SOL');

    applySortByFundingRate();

    const positionRows = screen
      .getAllByTestId(/perps-pro-market-position-row-/)
      .map((node) => node.props.testID);

    expect(positionRows).toEqual([
      'perps-pro-market-position-row-BTC',
      'perps-pro-market-position-row-SOL',
      'perps-pro-market-position-row-ETH',
    ]);
  });

  it('opens the sort sheet from the positions settings button', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'SOL' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_SORT_BUTTON),
    );

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_SORT_SHEET),
    ).toBeOnTheScreen();
  });

  it('sorts positions by position value high to low by default', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC', positionValue: '1000' }),
        makePosition({ symbol: 'SOL', positionValue: '5000' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    const positionTexts = screen
      .getAllByTestId(/perps-pro-market-position-row-/)
      .map((node) => node.props.testID);

    expect(positionTexts[0]).toContain('SOL');
    expect(positionTexts[1]).toContain('BTC');
  });

  it('opens the side filter sheet from the all sides button', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'SOL' })],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    expect(screen.getByText('All sides')).toBeOnTheScreen();

    openSideFilterSheet();

    expect(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_SHEET,
      ),
    ).toBeOnTheScreen();
  });

  it('filters positions to long only when side filter is applied', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC', size: '1' }),
        makePosition({ symbol: 'SOL', size: '-1' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    applySideFilter('long');

    expect(screen.getByText('Long')).toBeOnTheScreen();
    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.queryByText('SOL')).toBeNull();
  });

  it('shows side-filter empty copy when ticker-only and side filter hide all matches', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC' }),
        makePosition({ symbol: 'SOL', size: '-1' }),
      ],
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLivePositions>);

    renderPanel('SOL');

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY),
    );
    applySideFilter('long');

    expect(screen.getByText('No long positions.')).toBeOnTheScreen();
    expect(screen.queryByText('No open SOL positions.')).toBeNull();
  });
});
