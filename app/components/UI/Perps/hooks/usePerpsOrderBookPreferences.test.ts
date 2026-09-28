import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsOrderBookPreferences } from './usePerpsOrderBookPreferences';
import { selectPerpsOrderBookPreferences } from '../selectors/perpsController';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setOrderBookPreferences: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsOrderBookPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns listed-by preferences from the selector', () => {
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsOrderBookPreferences
        ? { currency: 'base', metric: 'size' }
        : undefined,
    );

    const { result } = renderHook(() => usePerpsOrderBookPreferences());

    expect(result.current.preferences).toEqual({
      currency: 'base',
      metric: 'size',
    });
  });

  it('persists a listed-by patch via setOrderBookPreferences', () => {
    mockUseSelector.mockReturnValue({ currency: 'usd', metric: 'total' });

    const { result } = renderHook(() => usePerpsOrderBookPreferences());

    act(() => {
      result.current.setOrderBookPreferences({ metric: 'size' });
    });

    expect(
      Engine.context.PerpsController.setOrderBookPreferences,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.PerpsController.setOrderBookPreferences,
    ).toHaveBeenCalledWith({ metric: 'size' });
  });
});
