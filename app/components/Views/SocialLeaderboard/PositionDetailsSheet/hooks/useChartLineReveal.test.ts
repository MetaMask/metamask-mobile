import { act, renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import {
  LINE_DRAW_DURATION_MS,
  useChartLineReveal,
} from './useChartLineReveal';

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { ...actual, useReducedMotion: jest.fn(() => false) };
});

const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockUseReducedMotion = jest.mocked(useReducedMotion);

interface Props {
  isChartReady: boolean;
  hasChartData: boolean;
}

const renderReveal = (initialProps: Props) =>
  renderHook((props: Props) => useChartLineReveal(props), { initialProps });

describe('useChartLineReveal', () => {
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
  ])('shows the line already drawn with %s', (_label, arrange) => {
    arrange();

    const { result } = renderReveal({
      isChartReady: false,
      hasChartData: false,
    });

    expect(result.current.isAnimated).toBe(false);
    expect(result.current.lineProgress.value).toBe(1);
  });

  it('treats an unknown hardware tier as capable', () => {
    mockGetHardwareTier.mockReturnValue(null);

    const { result } = renderReveal({
      isChartReady: false,
      hasChartData: false,
    });

    expect(result.current.isAnimated).toBe(true);
    expect(result.current.lineProgress.value).toBe(0);
  });

  it('waits for the chart before drawing the line', () => {
    const { result } = renderReveal({
      isChartReady: false,
      hasChartData: false,
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.lineProgress.value).toBe(0);
  });

  it('draws the line once the chart is ready', () => {
    const { result } = renderReveal({ isChartReady: true, hasChartData: true });

    act(() => {
      jest.advanceTimersByTime(LINE_DRAW_DURATION_MS);
    });

    expect(result.current.lineProgress.value).toBe(1);
  });

  it('draws a line that arrives after an empty chart', () => {
    const { result, rerender } = renderReveal({
      isChartReady: true,
      hasChartData: false,
    });
    expect(result.current.lineProgress.value).toBe(0);

    rerender({ isChartReady: true, hasChartData: true });
    act(() => {
      jest.advanceTimersByTime(LINE_DRAW_DURATION_MS);
    });

    expect(result.current.lineProgress.value).toBe(1);
  });
});
