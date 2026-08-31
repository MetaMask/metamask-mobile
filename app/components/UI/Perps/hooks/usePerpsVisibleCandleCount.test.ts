import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsVisibleCandleCount } from '../selectors/perpsController';
import { usePerpsVisibleCandleCount } from './usePerpsVisibleCandleCount';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setVisibleCandleCount: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsVisibleCandleCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsVisibleCandleCount ? 30 : undefined,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the persisted visible candle count', () => {
    mockUseSelector.mockReturnValue(80);

    const { result } = renderHook(() => usePerpsVisibleCandleCount('BTC'));

    expect(result.current.visibleCandleCount).toBe(80);
  });

  it('debounces persist of a zoomed candle count', () => {
    const { result } = renderHook(() => usePerpsVisibleCandleCount('BTC'));

    act(() => {
      result.current.onVisibleCandleCountChange(80);
      result.current.onVisibleCandleCountChange(90);
    });

    expect(
      Engine.context.PerpsController.setVisibleCandleCount,
    ).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(
      Engine.context.PerpsController.setVisibleCandleCount,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.PerpsController.setVisibleCandleCount,
    ).toHaveBeenCalledWith(90);
    expect(result.current.visibleCandleCount).toBe(90);
  });

  it('does not persist an unchanged candle count', () => {
    const { result } = renderHook(() => usePerpsVisibleCandleCount('BTC'));

    act(() => {
      result.current.onVisibleCandleCountChange(30);
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(
      Engine.context.PerpsController.setVisibleCandleCount,
    ).not.toHaveBeenCalled();
  });

  it('flushes a pending count when the market symbol changes', () => {
    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) => usePerpsVisibleCandleCount(symbol),
      { initialProps: { symbol: 'BTC' } },
    );

    act(() => {
      result.current.onVisibleCandleCountChange(60);
    });

    rerender({ symbol: 'ETH' });

    expect(
      Engine.context.PerpsController.setVisibleCandleCount,
    ).toHaveBeenCalledWith(60);
    expect(result.current.visibleCandleCount).toBe(60);
  });
});
