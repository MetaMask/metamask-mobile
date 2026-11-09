import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsOrderBookPreferences } from '../selectors/perpsController';
import { usePerpsSizeDenomination } from './usePerpsSizeDenomination';

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

describe('usePerpsSizeDenomination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads a saved coin unit from the order-book currency', () => {
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsOrderBookPreferences
        ? { currency: 'base', metric: 'size' }
        : undefined,
    );

    const { result } = renderHook(() => usePerpsSizeDenomination());

    expect(result.current.denomination).toBe('asset');
  });

  it('writes the order-book currency when the unit changes', () => {
    mockUseSelector.mockReturnValue({ currency: 'usd', metric: 'total' });

    const { result } = renderHook(() => usePerpsSizeDenomination());

    act(() => {
      result.current.setDenomination('asset');
    });

    expect(
      Engine.context.PerpsController.setOrderBookPreferences,
    ).toHaveBeenCalledWith({ currency: 'base' });
  });
});
