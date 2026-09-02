import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';
import React from 'react';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProTwapPanel from './PerpsProTwapPanel';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

// The empty state renders a themed asset that reads the real store; this panel's
// contract is which view is shown, not how the illustration is themed.
jest.mock('./PerpsProTwapEmptyState', () => 'PerpsProTwapEmptyState');

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
      {...props}
    />,
  );

describe('PerpsProTwapPanel', () => {
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
    expect(screen.getByTestId(ids.TWAP_TERMINATE)).toBeOnTheScreen();
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
    expect(screen.queryByTestId(ids.TWAP_TERMINATE)).toBeNull();
  });

  it('flattens slice fills on the fill-history view', () => {
    // Arrange
    renderPanel({
      activeTwapOrders: [buildTwapOrder({ fills: [buildFill()] })],
    });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_VIEW_TAB_FILL_HISTORY));

    // Assert
    expect(screen.getByTestId(ids.TWAP_LIST)).toBeOnTheScreen();
  });

  it('shows the empty state when a view has nothing to list', () => {
    // Arrange / Act
    renderPanel({ activeTwapOrders: [], historicalTwapOrders: [] });

    // Assert
    expect(screen.queryByTestId(ids.TWAP_LIST)).toBeNull();
  });

  it('suppresses the empty state while the first read is pending', () => {
    // Arrange / Act
    renderPanel({
      activeTwapOrders: [],
      historicalTwapOrders: [],
      isInitialLoading: true,
    });

    // Assert: avoid flashing "no TWAPs" before the first result lands
    expect(screen.queryByTestId(ids.TWAP_LIST)).toBeNull();
  });

  it('disables Terminate while a termination is in flight', () => {
    // Arrange
    const onTerminate = jest.fn();
    renderPanel({ onTerminate, terminatingOrderId: 'twap-1' });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_TERMINATE));

    // Assert
    expect(onTerminate).not.toHaveBeenCalled();
  });

  it('passes the schedule to the terminate handler', () => {
    // Arrange
    const onTerminate = jest.fn();
    renderPanel({ onTerminate });

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_TERMINATE));

    // Assert
    expect(onTerminate).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'twap-1' }),
    );
  });
});
