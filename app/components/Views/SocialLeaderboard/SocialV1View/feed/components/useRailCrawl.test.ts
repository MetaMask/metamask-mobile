import { act, renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import {
  driftOffset,
  RAIL_DRIFT_DECELERATION,
  RAIL_DRIFT_MIN_VELOCITY,
} from './hotTokenRailMotion';
import { useRailCrawl } from './useRailCrawl';

type EndCallback = (result: { finished: boolean }) => void;

const TRACK_WIDTH = 800;

describe('useRailCrawl', () => {
  let timingSpy: jest.SpyInstance;
  let decaySpy: jest.SpyInstance;
  let endCallbacks: EndCallback[];
  let decayCallbacks: EndCallback[];

  /** The `finished` result for the most recent lap. */
  const endLastLap = (finished: boolean) =>
    act(() => {
      endCallbacks[endCallbacks.length - 1]({ finished });
    });

  /** The `finished` result for the most recent coast. */
  const endLastCoast = (finished: boolean) =>
    act(() => {
      decayCallbacks[decayCallbacks.length - 1]({ finished });
    });

  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    endCallbacks = [];
    decayCallbacks = [];
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: (callback: EndCallback) => {
            endCallbacks.push(callback);
          },
          stop: jest.fn(),
          reset: jest.fn(),
        }) as unknown as Animated.CompositeAnimation,
    );
    decaySpy = jest.spyOn(Animated, 'decay').mockImplementation(
      () =>
        ({
          start: (callback: EndCallback) => {
            decayCallbacks.push(callback);
          },
          stop: jest.fn(),
          reset: jest.fn(),
        }) as unknown as Animated.CompositeAnimation,
    );
  });

  afterEach(() => {
    timingSpy.mockRestore();
    decaySpy.mockRestore();
    jest.useRealTimers();
  });

  it('runs a native lap across the track while enabled', () => {
    renderHook(() => useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }));

    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: TRACK_WIDTH,
        duration: (TRACK_WIDTH / 24) * 1000,
        useNativeDriver: true,
      }),
    );
  });

  it('does not crawl while disabled', () => {
    renderHook(() => useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: false }));

    expect(timingSpy).not.toHaveBeenCalled();
  });

  it('does not crawl before the track is measured', () => {
    renderHook(() => useRailCrawl({ trackWidth: 0, enabled: true }));

    expect(timingSpy).not.toHaveBeenCalled();
  });

  it('starts the next lap from the start when a lap completes', () => {
    renderHook(() => useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }));

    endLastLap(true);

    expect(timingSpy).toHaveBeenCalledTimes(2);
    expect(timingSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: (TRACK_WIDTH / 24) * 1000 }),
    );
  });

  it('does not start another lap when a lap is stopped', () => {
    renderHook(() => useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }));

    endLastLap(false);

    expect(timingSpy).toHaveBeenCalledTimes(1);
  });

  it('predicts the crawl position from the elapsed time', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }),
    );

    jest.setSystemTime(5000);

    expect(result.current.readOffset()).toBeCloseTo(120);
  });

  it('resumes from where it stopped when enabled again', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useRailCrawl({ trackWidth: TRACK_WIDTH, enabled }),
      { initialProps: { enabled: true } },
    );
    jest.setSystemTime(5000);

    rerender({ enabled: false });
    jest.setSystemTime(60000);

    expect(result.current.readOffset()).toBeCloseTo(120);

    rerender({ enabled: true });

    expect(timingSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: ((TRACK_WIDTH - 120) / 24) * 1000,
      }),
    );
  });

  it('scrubs against where the drag began and resumes on release', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }),
    );
    jest.setSystemTime(5000);

    act(() => result.current.hold());
    act(() => result.current.scrubBy(-100));

    expect(result.current.readOffset()).toBeCloseTo(220);

    act(() => result.current.release());

    expect(timingSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: ((TRACK_WIDTH - 220) / 24) * 1000,
      }),
    );
  });

  it('wraps a scrub past the start of the track', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }),
    );

    act(() => result.current.hold());
    act(() => result.current.scrubBy(50));

    expect(result.current.readOffset()).toBe(TRACK_WIDTH - 50);
  });

  it('does not resume on release when the crawl is disabled', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: false }),
    );

    act(() => result.current.hold());
    act(() => result.current.release());

    expect(timingSpy).not.toHaveBeenCalled();
  });

  it('coasts a flick and resumes the crawl from where the coast ends', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }),
    );
    act(() => result.current.hold());
    const lapsBeforeCoast = timingSpy.mock.calls.length;

    act(() => result.current.release(-480));

    expect(decaySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        velocity: 480 / 1000,
        deceleration: RAIL_DRIFT_DECELERATION,
        useNativeDriver: true,
      }),
    );
    expect(timingSpy).toHaveBeenCalledTimes(lapsBeforeCoast);

    jest.setSystemTime(200);
    const coasted = driftOffset(0, 480 / 1000, 200);
    expect(result.current.readOffset()).toBeCloseTo(coasted);

    endLastCoast(true);

    expect(timingSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: ((TRACK_WIDTH - coasted) / 24) * 1000,
      }),
    );
  });

  it('coasts backward when the flick opposes the crawl', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }),
    );
    act(() => result.current.hold());

    act(() => result.current.release(480));

    expect(decaySpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ velocity: -480 / 1000 }),
    );

    jest.setSystemTime(200);

    expect(result.current.readOffset()).toBeCloseTo(
      TRACK_WIDTH + driftOffset(0, -480 / 1000, 200),
    );
  });

  it('resumes the crawl directly when the flick is below the coast threshold', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }),
    );
    act(() => result.current.hold());
    const lapsBeforeRelease = timingSpy.mock.calls.length;

    act(() => result.current.release(RAIL_DRIFT_MIN_VELOCITY - 1));

    expect(decaySpy).not.toHaveBeenCalled();
    expect(timingSpy).toHaveBeenCalledTimes(lapsBeforeRelease + 1);
  });

  it('coasts a flick while the crawl is disabled and stays parked when it ends', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: false }),
    );
    act(() => result.current.hold());

    act(() => result.current.release(-480));
    jest.setSystemTime(200);
    endLastCoast(true);

    expect(decaySpy).toHaveBeenCalled();
    expect(timingSpy).not.toHaveBeenCalled();
    expect(result.current.readOffset()).toBeCloseTo(
      driftOffset(0, 480 / 1000, 200),
    );
  });

  it('ignores a release that arrives after the flick has started coasting', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }),
    );
    act(() => result.current.hold());

    act(() => result.current.release(-480));
    act(() => result.current.release());

    expect(decaySpy).toHaveBeenCalledTimes(1);
    expect(timingSpy).toHaveBeenCalledTimes(1);
  });

  it('does not resume the crawl when a coast is stopped', () => {
    const { result } = renderHook(() =>
      useRailCrawl({ trackWidth: TRACK_WIDTH, enabled: true }),
    );
    act(() => result.current.hold());
    act(() => result.current.release(-480));
    const lapsBeforeStop = timingSpy.mock.calls.length;

    endLastCoast(false);

    expect(timingSpy).toHaveBeenCalledTimes(lapsBeforeStop);
  });

  it('does not restart the crawl under a finger on relayout', () => {
    const { result, rerender } = renderHook(
      ({ trackWidth }) => useRailCrawl({ trackWidth, enabled: true }),
      { initialProps: { trackWidth: TRACK_WIDTH } },
    );
    act(() => result.current.hold());
    timingSpy.mockClear();

    rerender({ trackWidth: 900 });

    expect(timingSpy).not.toHaveBeenCalled();
  });
});
