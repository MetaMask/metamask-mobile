import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsProOrdersPreferences } from './usePerpsProOrdersPreferences';
import {
  selectPerpsProOrdersSideFilter,
  selectPerpsProOrdersSortConfig,
} from '../selectors/perpsController';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setProLayoutPreferences: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsProOrdersPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns sideFilter and sortConfig from the controller selectors', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsProOrdersSideFilter) {
        return 'short';
      }
      if (selector === selectPerpsProOrdersSortConfig) {
        return { field: 'orderValue', direction: 'asc' };
      }
      return undefined;
    });

    const { result } = renderHook(() => usePerpsProOrdersPreferences());

    expect(result.current.sideFilter).toBe('short');
    expect(result.current.sortConfig).toEqual({
      field: 'orderValue',
      direction: 'asc',
    });
  });

  it('persists ordersSideFilter via setProLayoutPreferences', () => {
    mockUseSelector.mockReturnValue('all');

    const { result } = renderHook(() => usePerpsProOrdersPreferences());

    act(() => {
      result.current.setSideFilter('long');
    });

    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledWith({ ordersSideFilter: 'long' });
  });

  it('maps nested sortConfig to flat controller fields on write', () => {
    mockUseSelector.mockReturnValue({
      field: 'time',
      direction: 'desc',
    });

    const { result } = renderHook(() => usePerpsProOrdersPreferences());

    act(() => {
      result.current.setSortConfig({
        field: 'price',
        direction: 'asc',
      });
    });

    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledWith({
      ordersSortField: 'price',
      ordersSortDirection: 'asc',
    });
  });
});
