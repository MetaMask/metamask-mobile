import { act, renderHook } from '@testing-library/react-native';
import type { GestureResponderEvent } from 'react-native';
import { createEarningsPoint } from './EarningsChart.testUtils';
import { useEarningsChartScrub } from './useEarningsChartScrub';

const availablePoints = [
  createEarningsPoint({ amountUsd: 1 }),
  createEarningsPoint({ amountUsd: 2 }),
  createEarningsPoint({ amountUsd: 3 }),
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
    const unavailablePoint = createEarningsPoint({
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

  it('selects the point under the finger when scrubbing starts on an unavailable point', () => {
    const unavailablePoint = createEarningsPoint({
      amountUsd: null,
      available: false,
    });
    const points = [
      unavailablePoint,
      unavailablePoint,
      unavailablePoint,
      ...availablePoints,
    ];
    const { result } = renderHook(() =>
      useEarningsChartScrub({
        points,
        plotWidth: 300,
      }),
    );
    const { panHandlers } = result.current.panResponder;

    act(() => {
      result.current.handlePointPressIn(2, points[2]);
      panHandlers.onMoveShouldSetResponderCapture?.(
        createGestureEvent(125, 125),
      );
      panHandlers.onResponderGrant?.(createGestureEvent(125, 125));
      panHandlers.onResponderMove?.(createGestureEvent(175, 125));
    });

    expect(result.current.activeIndex).toBe(3);
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
