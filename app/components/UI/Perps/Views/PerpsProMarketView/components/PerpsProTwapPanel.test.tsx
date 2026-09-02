import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { PERPS_TWAP_UI_CONFIG } from '../../../constants/perpsConfig';
import {
  getPerpsProTwapFillRowSelector,
  getPerpsProTwapRowSelector,
  getPerpsProTwapTerminateSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import PerpsProTwapPanel from './PerpsProTwapPanel';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

// The empty state renders a themed asset that reads the real store; this panel's
// contract is which view and filter metadata it receives.
jest.mock('./PerpsProTwapEmptyState', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return (props: {
    view: string;
    filteredTicker?: string;
    filteredSideDescriptionKey?: string;
  }) =>
    ReactLocal.createElement(
      Text,
      { testID: 'twap-empty-state' },
      JSON.stringify(props),
    );
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

const buildFill = (overrides: Partial<TwapOrderFill> = {}): TwapOrderFill => ({
  fillId: 'fill-1',
  orderId: 'twap-1',
  side: 'buy',
  price: '50000',
  size: '1',
  fee: '0.5',
  feeToken: 'USDC',
  timestamp: 1_700_000_100_000,
  transactionHash: '0xabc',
  ...overrides,
});

const buildTwapOrder = (overrides: Partial<TwapOrder> = {}): TwapOrder => ({
  orderId: 'twap-1',
  symbol: 'BTC',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '400',
  averagePrice: '50000',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 600_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_700_000_000_000,
  lastUpdated: 1_700_000_600_000,
  fills: [],
  ...overrides,
});

const ids = PerpsProMarketViewSelectorsIDs;

const renderPanel = (
  props: Partial<React.ComponentProps<typeof PerpsProTwapPanel>> = {},
) =>
  render(
    <PerpsProTwapPanel
      activeTwapOrders={[buildTwapOrder()]}
      historicalTwapOrders={[]}
      isInitialLoading={false}
      onTerminate={jest.fn()}
      terminatingOrderId={null}
      error={null}
      onRetry={jest.fn()}
      isRefreshing={false}
      {...props}
    />,
  );

describe('PerpsProTwapPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSelector).mockReturnValue(false);
  });

  it('offers all three views', () => {
    // Arrange / Act
    renderPanel();

    // Assert
    expect(screen.getByTestId(ids.TWAP_VIEW_TAB_ACTIVE)).toBeOnTheScreen();
    expect(screen.getByTestId(ids.TWAP_VIEW_TAB_HISTORY)).toBeOnTheScreen();
    expect(
      screen.getByTestId(ids.TWAP_VIEW_TAB_FILL_HISTORY),
    ).toBeOnTheScreen();
  });

  it('shows active schedules first', () => {
    // Arrange / Act
    renderPanel();

    // Assert
    expect(screen.getByTestId(ids.TWAP_LIST)).toBeOnTheScreen();
    expect(
      screen.getByTestId(getPerpsProTwapTerminateSelector(undefined, 'twap-1')),
    ).toBeOnTheScreen();
  });

  it('switches to terminal schedules on the history view', () => {
    // Arrange
    renderPanel({
      activeTwapOrders: [],
      historicalTwapOrders: [
        buildTwapOrder({ orderId: 'done', status: 'completed' }),
      ],
    });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_HISTORY));

    // Assert
    expect(screen.getByTestId(ids.TWAP_LIST)).toBeOnTheScreen();
  });

  it('does not offer Terminate on a terminal schedule', () => {
    // Arrange
    renderPanel({
      activeTwapOrders: [],
      historicalTwapOrders: [
        buildTwapOrder({ orderId: 'done', status: 'completed' }),
      ],
    });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_HISTORY));

    // Assert: a finished schedule has nothing left to stop
    expect(
      screen.queryByTestId(getPerpsProTwapTerminateSelector(undefined, 'done')),
    ).toBeNull();
  });

  it('flattens slice fills on the fill-history view', () => {
    // Arrange
    renderPanel({
      activeTwapOrders: [
        buildTwapOrder({
          fills: [buildFill({ fillId: 'f1' }), buildFill({ fillId: 'f2' })],
        }),
      ],
    });

    // Assert: the active view shows schedules, not fills
    expect(
      screen.queryByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'f1'),
      ),
    ).toBeNull();

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_FILL_HISTORY));

    // Assert: both slices of the one schedule are now listed individually
    expect(
      screen.getByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'f1'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'f2'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getPerpsProTwapTerminateSelector(undefined, 'twap-1'),
      ),
    ).toBeNull();
  });

  it('renders at most one page of fill history at a time', () => {
    // Arrange
    const fills = Array.from({ length: 51 }, (_, index) =>
      buildFill({ fillId: `fill-${index}`, timestamp: index }),
    );
    renderPanel({
      activeTwapOrders: [buildTwapOrder({ fills })],
    });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_FILL_HISTORY));

    // Assert: the newest page is bounded to 50 rows
    expect(
      screen.getByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'fill-50'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'fill-0'),
      ),
    ).toBeNull();

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_FILL_NEXT));

    // Assert: paging replaces the mounted rows instead of accumulating them
    expect(
      screen.getByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'fill-0'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'fill-50'),
      ),
    ).toBeNull();
  });

  it('preserves fill page two across a same-content reconciliation', () => {
    // Arrange
    const firstFills = Array.from({ length: 51 }, (_, index) =>
      buildFill({ fillId: `first-${index}`, timestamp: index }),
    );
    const view = renderPanel({
      activeTwapOrders: [buildTwapOrder({ fills: firstFills })],
    });
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_FILL_HISTORY));
    fireEvent.press(screen.getByTestId(ids.TWAP_FILL_NEXT));
    expect(
      screen.getByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'first-0'),
      ),
    ).toBeOnTheScreen();

    // Act: reconciliation allocates fresh arrays and objects for identical
    // controller content.
    view.rerender(
      <PerpsProTwapPanel
        activeTwapOrders={[
          buildTwapOrder({
            fills: firstFills.map((fill) => ({ ...fill })),
          }),
        ]}
        historicalTwapOrders={[]}
        isInitialLoading={false}
        onTerminate={jest.fn()}
        terminatingOrderId={null}
        error={null}
        onRetry={jest.fn()}
        isRefreshing={false}
      />,
    );

    // Assert: page one remains selected; array identity alone is not a filter.
    expect(
      screen.getByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'first-0'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'first-50'),
      ),
    ).toBeNull();
  });

  it('preserves fill page two when reconciliation appends a new fill', () => {
    // Arrange
    const firstFills = Array.from({ length: 51 }, (_, index) =>
      buildFill({ fillId: `fill-${index}`, timestamp: index }),
    );
    const view = renderPanel({
      activeTwapOrders: [buildTwapOrder({ fills: firstFills })],
    });
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_FILL_HISTORY));
    fireEvent.press(screen.getByTestId(ids.TWAP_FILL_NEXT));

    // Act
    view.rerender(
      <PerpsProTwapPanel
        activeTwapOrders={[
          buildTwapOrder({
            fills: [
              ...firstFills,
              buildFill({ fillId: 'fill-appended', timestamp: 100 }),
            ],
          }),
        ]}
        historicalTwapOrders={[]}
        isInitialLoading={false}
        onTerminate={jest.fn()}
        terminatingOrderId={null}
        error={null}
        onRetry={jest.fn()}
        isRefreshing={false}
      />,
    );

    // Assert
    expect(
      screen.getByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'fill-0'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'fill-appended'),
      ),
    ).toBeNull();
  });

  it('clamps fill pagination when the page count shrinks', async () => {
    // Arrange
    const pageSize = PERPS_TWAP_UI_CONFIG.FillHistoryPageSize;
    const firstFills = Array.from({ length: pageSize * 2 + 1 }, (_, index) =>
      buildFill({ fillId: `first-${index}`, timestamp: index }),
    );
    const view = renderPanel({
      activeTwapOrders: [buildTwapOrder({ fills: firstFills })],
    });
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_FILL_HISTORY));
    fireEvent.press(screen.getByTestId(ids.TWAP_FILL_NEXT));
    fireEvent.press(screen.getByTestId(ids.TWAP_FILL_NEXT));

    // Act
    const nextFills = Array.from({ length: pageSize + 1 }, (_, index) =>
      buildFill({ fillId: `next-${index}`, timestamp: index }),
    );
    view.rerender(
      <PerpsProTwapPanel
        activeTwapOrders={[buildTwapOrder({ fills: nextFills })]}
        historicalTwapOrders={[]}
        isInitialLoading={false}
        onTerminate={jest.fn()}
        terminatingOrderId={null}
        error={null}
        onRetry={jest.fn()}
        isRefreshing={false}
      />,
    );

    // Assert: page three clamps to the new last page, not page one.
    expect(
      await screen.findByTestId(
        getPerpsProTwapFillRowSelector(undefined, 'twap-1', 'next-0'),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(ids.TWAP_FILL_NEXT)).toBeDisabled();
  });

  it('bounds schedule history and navigates between pages', () => {
    // Arrange
    const pageSize = PERPS_TWAP_UI_CONFIG.HistoryPageSize;
    const historyOrders = Array.from({ length: pageSize + 1 }, (_, index) =>
      buildTwapOrder({
        orderId: `history-${index}`,
        status: 'completed',
        startedAt: pageSize - index,
      }),
    );
    renderPanel({ activeTwapOrders: [], historicalTwapOrders: historyOrders });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_HISTORY));

    // Assert
    expect(
      screen.getByTestId(getPerpsProTwapRowSelector(undefined, 'history-0')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getPerpsProTwapRowSelector(undefined, `history-${pageSize}`),
      ),
    ).toBeNull();

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_HISTORY_NEXT));

    // Assert
    expect(
      screen.getByTestId(
        getPerpsProTwapRowSelector(undefined, `history-${pageSize}`),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getPerpsProTwapRowSelector(undefined, 'history-0')),
    ).toBeNull();
  });

  it('clamps schedule history to the last remaining page', async () => {
    // Arrange
    const pageSize = PERPS_TWAP_UI_CONFIG.HistoryPageSize;
    const firstHistory = Array.from({ length: pageSize * 2 + 1 }, (_, index) =>
      buildTwapOrder({
        orderId: `first-history-${index}`,
        status: 'completed',
      }),
    );
    const view = renderPanel({
      activeTwapOrders: [],
      historicalTwapOrders: firstHistory,
    });
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_HISTORY));
    fireEvent.press(screen.getByTestId(ids.TWAP_HISTORY_NEXT));
    fireEvent.press(screen.getByTestId(ids.TWAP_HISTORY_NEXT));

    // Act
    const nextHistory = Array.from({ length: pageSize + 1 }, (_, index) =>
      buildTwapOrder({
        orderId: `next-history-${index}`,
        status: 'completed',
      }),
    );
    view.rerender(
      <PerpsProTwapPanel
        activeTwapOrders={[]}
        historicalTwapOrders={nextHistory}
        isInitialLoading={false}
        onTerminate={jest.fn()}
        terminatingOrderId={null}
        error={null}
        onRetry={jest.fn()}
        isRefreshing={false}
      />,
    );

    // Assert
    expect(
      await screen.findByTestId(
        getPerpsProTwapRowSelector(undefined, `next-history-${pageSize}`),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(ids.TWAP_HISTORY_NEXT)).toBeDisabled();
  });

  it('shows a retryable error without hiding confirmed schedules', () => {
    // Arrange
    const onRetry = jest.fn();
    renderPanel({ error: 'venue down', onRetry });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_RETRY));

    // Assert
    expect(screen.getByTestId(ids.TWAP_ERROR)).toBeOnTheScreen();
    expect(screen.getByTestId(ids.TWAP_LIST)).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not present a load failure as an empty TWAP result', () => {
    // Arrange / Act
    renderPanel({
      activeTwapOrders: [],
      historicalTwapOrders: [],
      error: 'venue down',
    });

    // Assert
    expect(screen.getByTestId(ids.TWAP_ERROR)).toBeOnTheScreen();
    expect(screen.queryByTestId('twap-empty-state')).toBeNull();
  });

  it('disables retry and shows progress while refresh is in flight', () => {
    // Arrange
    const onRetry = jest.fn();
    renderPanel({ error: 'venue down', isRefreshing: true, onRetry });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_RETRY));

    // Assert
    expect(onRetry).not.toHaveBeenCalled();
    expect(screen.getByTestId(ids.TWAP_RETRY)).toBeDisabled();
  });

  it('shows the empty state when a view has nothing to list', () => {
    // Arrange / Act
    renderPanel({ activeTwapOrders: [], historicalTwapOrders: [] });

    // Assert: the empty state itself renders, not merely an absent list
    expect(screen.queryByTestId(ids.TWAP_LIST)).toBeNull();
    expect(screen.getByTestId('twap-empty-state')).toBeOnTheScreen();
  });

  it('shows loading progress while the first read is pending', () => {
    // Arrange / Act
    renderPanel({
      activeTwapOrders: [],
      historicalTwapOrders: [],
      isInitialLoading: true,
    });

    // Assert: "no TWAPs" cannot flash before the first result lands.
    expect(screen.queryByTestId(ids.TWAP_LIST)).toBeNull();
    expect(screen.queryByTestId('twap-empty-state')).toBeNull();
    expect(screen.getByTestId(ids.TWAP_LOADING)).toBeOnTheScreen();
  });

  it('uses empty metadata from the selected history view', () => {
    // Arrange
    renderPanel({
      activeTwapOrders: [],
      historicalTwapOrders: [],
      emptyMetadataByView: {
        active: { filteredTicker: 'BTC' },
        history: {
          filteredSideDescriptionKey:
            'perps.pro_positions_panel.twap_empty_short',
        },
      },
    });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_HISTORY));

    // Assert
    expect(screen.getByTestId('twap-empty-state')).toHaveTextContent(
      /twap_empty_short/u,
    );
    expect(screen.getByTestId('twap-empty-state')).not.toHaveTextContent(
      /BTC/u,
    );
  });

  it('disables Terminate while a termination is in flight', () => {
    // Arrange
    const onTerminate = jest.fn();
    renderPanel({ onTerminate, terminatingOrderId: 'twap-1' });

    // Act
    fireEvent.press(
      screen.getByTestId(getPerpsProTwapTerminateSelector(undefined, 'twap-1')),
    );

    // Assert
    expect(onTerminate).not.toHaveBeenCalled();
  });

  it('disables an accepted termination awaiting terminal confirmation', () => {
    // Arrange
    const onTerminate = jest.fn();
    renderPanel({
      onTerminate,
      acceptedTerminationOrderIdentityKey: 'hyperliquid:twap-1',
    });

    // Act
    fireEvent.press(
      screen.getByTestId(getPerpsProTwapTerminateSelector(undefined, 'twap-1')),
    );

    // Assert
    expect(onTerminate).not.toHaveBeenCalled();
  });

  it('passes the schedule to the terminate handler', () => {
    // Arrange
    const onTerminate = jest.fn();
    renderPanel({ onTerminate });

    // Act
    fireEvent.press(
      screen.getByTestId(getPerpsProTwapTerminateSelector(undefined, 'twap-1')),
    );

    // Assert
    expect(onTerminate).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'twap-1' }),
    );
  });
});
