import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsVisibleCandleCount } from './usePerpsVisibleCandleCount';
import { selectPerpsVisibleCandleCount } from '../selectors/perpsController';

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
  });

  it('returns the visible candle count from the selector', () => {
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsVisibleCandleCount ? 60 : undefined,
    );

    const { result } = renderHook(() => usePerpsVisibleCandleCount());

    expect(result.current.visibleCandleCount).toBe(60);
  });

  it('persists a new visible candle count via setVisibleCandleCount', () => {
    mockUseSelector.mockReturnValue(30);

    const { result } = renderHook(() => usePerpsVisibleCandleCount());

    act(() => {
      result.current.setVisibleCandleCount(80);
    });

    expect(
      Engine.context.PerpsController.setVisibleCandleCount,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.PerpsController.setVisibleCandleCount,
    ).toHaveBeenCalledWith(80);
  });

  it('skips the controller write when the count is unchanged', () => {
    mockUseSelector.mockReturnValue(30);

    const { result } = renderHook(() => usePerpsVisibleCandleCount());

    act(() => {
      result.current.setVisibleCandleCount(30);
    });

    expect(
      Engine.context.PerpsController.setVisibleCandleCount,
    ).not.toHaveBeenCalled();
  });
});
