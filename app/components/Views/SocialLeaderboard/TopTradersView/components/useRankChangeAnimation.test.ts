import { renderHook } from '@testing-library/react-native';
import {
  useReducedMotion,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  RANK_CHANGE_DURATION,
  useRankChangeAnimation,
} from './useRankChangeAnimation';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
  withTiming: jest.fn((toValue) => toValue),
  withSequence: jest.fn((...steps) => steps[steps.length - 1]),
  useAnimatedStyle: (factory: () => unknown) => factory(),
  useSharedValue: (initial: unknown) => ({ value: initial }),
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);
const mockWithTiming = jest.mocked(withTiming);
const mockWithSequence = jest.mocked(withSequence);

describe('useRankChangeAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('does not animate on first render', () => {
    renderHook(() => useRankChangeAnimation(3));

    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(mockWithSequence).not.toHaveBeenCalled();
  });

  it('does not animate when the rank is unchanged', () => {
    const { rerender } = renderHook(
      ({ rank }) => useRankChangeAnimation(rank),
      { initialProps: { rank: 3 } },
    );

    rerender({ rank: 3 });

    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(mockWithSequence).not.toHaveBeenCalled();
  });

  it('animates over the shared reorder duration when the rank changes', () => {
    const { rerender } = renderHook(
      ({ rank }) => useRankChangeAnimation(rank),
      { initialProps: { rank: 5 } },
    );

    rerender({ rank: 2 });

    expect(mockWithTiming).toHaveBeenCalledWith(1, {
      duration: RANK_CHANGE_DURATION,
    });
    expect(mockWithSequence).toHaveBeenCalled();
  });

  it('scales up past 1 for a trader that climbed', () => {
    const { rerender } = renderHook(
      ({ rank }) => useRankChangeAnimation(rank),
      { initialProps: { rank: 5 } },
    );

    rerender({ rank: 2 });

    const [peakScale] = mockWithTiming.mock.calls[1];
    expect(peakScale).toBeGreaterThan(1);
  });

  it('scales down below 1 for a trader that fell', () => {
    const { rerender } = renderHook(
      ({ rank }) => useRankChangeAnimation(rank),
      { initialProps: { rank: 2 } },
    );

    rerender({ rank: 5 });

    const [peakScale] = mockWithTiming.mock.calls[1];
    expect(peakScale).toBeLessThan(1);
  });

  it('keeps the pulse subtle in both directions', () => {
    const { rerender } = renderHook(
      ({ rank }) => useRankChangeAnimation(rank),
      { initialProps: { rank: 5 } },
    );
    rerender({ rank: 2 });
    const [risePeak] = mockWithTiming.mock.calls[1] as [number];

    jest.clearAllMocks();

    const { rerender: rerenderFall } = renderHook(
      ({ rank }) => useRankChangeAnimation(rank),
      { initialProps: { rank: 2 } },
    );
    rerenderFall({ rank: 5 });
    const [fallPeak] = mockWithTiming.mock.calls[1] as [number];

    // Guards the "less zoom, more subtle" brief: a 5% swing either way would
    // read as a zoom rather than a nudge.
    expect(Math.abs(risePeak - 1)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(fallPeak - 1)).toBeLessThanOrEqual(0.05);
  });

  it('skips the pulse entirely when Reduce Motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { rerender } = renderHook(
      ({ rank }) => useRankChangeAnimation(rank),
      { initialProps: { rank: 5 } },
    );

    rerender({ rank: 1 });

    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(mockWithSequence).not.toHaveBeenCalled();
  });
});
