import { act, renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import {
  DETAILS_EXPAND_DURATION_MS,
  LINE_DRAW_DELAY_MS,
  LINE_DRAW_DURATION_MS,
  useTwoStepSheetReveal,
} from './useTwoStepSheetReveal';

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { ...actual, useReducedMotion: jest.fn(() => false) };
});

const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockUseReducedMotion = jest.mocked(useReducedMotion);

describe('useTwoStepSheetReveal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['LOW hardware', () => mockGetHardwareTier.mockReturnValue('LOW')],
    ['reduce motion', () => mockUseReducedMotion.mockReturnValue(true)],
  ])('opens straight to full height with %s', (_label, arrange) => {
    arrange();

    const { result } = renderHook(() =>
      useTwoStepSheetReveal({ isChartReady: false, hasChartData: false }),
    );

    expect(result.current.isAnimated).toBe(false);
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.lineProgress.value).toBe(1);
  });

  it('treats an unknown hardware tier as capable', () => {
    mockGetHardwareTier.mockReturnValue(null);

    const { result } = renderHook(() =>
      useTwoStepSheetReveal({ isChartReady: false, hasChartData: false }),
    );

    expect(result.current.isAnimated).toBe(true);
    expect(result.current.isExpanded).toBe(false);
  });

  it('holds step two while the chart is loading', () => {
    const { result } = renderHook(() =>
      useTwoStepSheetReveal({ isChartReady: false, hasChartData: false }),
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isExpanded).toBe(false);
    expect(result.current.lineProgress.value).toBe(0);
  });

  it('expands at once when there is no line to draw', () => {
    const { result } = renderHook(() =>
      useTwoStepSheetReveal({ isChartReady: true, hasChartData: false }),
    );

    expect(result.current.isExpanded).toBe(true);
  });

  it('draws the line, then expands the details', () => {
    const { result } = renderHook(() =>
      useTwoStepSheetReveal({ isChartReady: true, hasChartData: true }),
    );
    expect(result.current.isExpanded).toBe(false);

    act(() => {
      jest.advanceTimersByTime(
        LINE_DRAW_DELAY_MS + LINE_DRAW_DURATION_MS + DETAILS_EXPAND_DURATION_MS,
      );
    });

    expect(result.current.lineProgress.value).toBe(1);
    expect(result.current.isExpanded).toBe(true);
  });
});
