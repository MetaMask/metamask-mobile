import { act, renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useRailCrawl } from './useRailCrawl';

type EndCallback = (result: { finished: boolean }) => void;

const TRACK_WIDTH = 800;

describe('useRailCrawl', () => {
  let timingSpy: jest.SpyInstance;
  let endCallbacks: EndCallback[];

  /** The `finished` result for the most recent lap. */
  const endLastLap = (finished: boolean) =>
    act(() => {
      endCallbacks[endCallbacks.length - 1]({ finished });
    });

  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    endCallbacks = [];
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
  });

  afterEach(() => {
    timingSpy.mockRestore();
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
