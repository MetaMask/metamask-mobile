import { act, renderHook } from '@testing-library/react-native';
import type { GestureResponderEvent } from 'react-native';
import type { EarningsPoint } from './earningsHistory';
import { useEarningsChartScrub } from './useEarningsChartScrub';

const createPoint = ({
  amountUsd,
  available = true,
}: {
  amountUsd: number | null;
  available?: boolean;
}): EarningsPoint => ({
  start: '2026-11-09T00:00:00.000Z',
  periodEndExclusive: '2026-11-10T00:00:00.000Z',
  timestamp: '2026-11-09T00:00:00.000Z',
  amountUsd,
  granularity: 'day',
  periodStatus: 'complete',
  availability: {
    earnings: available ? 'available' : 'unavailable',
    usd_pricing: available ? 'available' : 'unavailable',
  },
  unavailableReasons: available ? [] : ['before_user_earnings_inception'],
});

const availablePoints = [
  createPoint({ amountUsd: 1 }),
  createPoint({ amountUsd: 2 }),
  createPoint({ amountUsd: 3 }),
];

let nextTimestamp = 1_000;

const createGestureEvent = (
  locationX: number,
  startX = locationX,
): GestureResponderEvent => {
  const timestamp = nextTimestamp;
  nextTimestamp += 10;

  return {
    nativeEvent: {
      locationX,
      locationY: 80,
      pageX: locationX,
      pageY: 80,
      identifier: 0,
      target: 0,
      timestamp,
      touches: [{ identifier: 0, pageX: locationX, pageY: 80 }],
    },
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          touchActive: true,
          startPageX: startX,
          startPageY: 80,
          startTimeStamp: timestamp,
          currentPageX: locationX,
          currentPageY: 80,
          currentTimeStamp: timestamp,
          previousPageX: locationX,
          previousPageY: 80,
          previousTimeStamp: timestamp,
        },
      ],
    },
  } as unknown as GestureResponderEvent;
};

describe('useEarningsChartScrub', () => {
  it('selects an available point on press and clears it on release', () => {
    const { result } = renderHook(() =>
      useEarningsChartScrub({
        points: availablePoints,
        plotWidth: 300,
      }),
    );

    act(() => {
      result.current.handlePointPressIn(1, availablePoints[1]);
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => {
      result.current.handlePointPressOut();
    });
    expect(result.current.activeIndex).toBeNull();
  });

  it('does not select an unavailable point', () => {
    const unavailablePoint = createPoint({
      amountUsd: null,
      available: false,
    });
    const { result } = renderHook(() =>
      useEarningsChartScrub({
        points: [availablePoints[0], unavailablePoint],
        plotWidth: 200,
      }),
    );

    act(() => {
      result.current.handlePointPressIn(1, unavailablePoint);
    });

    expect(result.current.activeIndex).toBeNull();
  });

  it('selects points while scrubbing and clears selection on release', () => {
    const setScrollEnabled = jest.fn();
    const { result } = renderHook(() =>
      useEarningsChartScrub({
        points: availablePoints,
        plotWidth: 300,
        setScrollEnabled,
      }),
    );
    const { panHandlers } = result.current.panResponder;

    act(() => {
      result.current.handlePointPressIn(0, availablePoints[0]);
      panHandlers.onMoveShouldSetResponderCapture?.(createGestureEvent(50));
      panHandlers.onResponderGrant?.(createGestureEvent(50));
      panHandlers.onResponderMove?.(createGestureEvent(250, 50));
    });

    expect(result.current.activeIndex).toBe(2);
    expect(
      panHandlers.onResponderTerminationRequest?.(createGestureEvent(250, 50)),
    ).toBe(false);

    act(() => {
      panHandlers.onResponderRelease?.(createGestureEvent(250, 50));
    });

    expect(result.current.activeIndex).toBeNull();
    expect(setScrollEnabled).toHaveBeenLastCalledWith(true);
  });

  it('resets selection without changing scroll state', () => {
    const setScrollEnabled = jest.fn();
    const { result } = renderHook(() =>
      useEarningsChartScrub({
        points: availablePoints,
        plotWidth: 300,
        setScrollEnabled,
      }),
    );

    act(() => {
      result.current.handlePointPressIn(0, availablePoints[0]);
      result.current.resetSelection();
    });

    expect(result.current.activeIndex).toBeNull();
    expect(setScrollEnabled).not.toHaveBeenCalled();
  });
});
