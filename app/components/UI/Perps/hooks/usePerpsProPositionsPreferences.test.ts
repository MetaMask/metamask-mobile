import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsProPositionsPreferences } from './usePerpsProPositionsPreferences';
import {
  selectPerpsProPositionsSideFilter,
  selectPerpsProPositionsSortConfig,
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

describe('usePerpsProPositionsPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns sideFilter and sortConfig from the controller selectors', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsProPositionsSideFilter) {
        return 'long';
      }
      if (selector === selectPerpsProPositionsSortConfig) {
        return { field: 'unrealizedPnl', direction: 'asc' };
      }
      return undefined;
    });

    const { result } = renderHook(() => usePerpsProPositionsPreferences());

    expect(result.current.sideFilter).toBe('long');
    expect(result.current.sortConfig).toEqual({
      field: 'unrealizedPnl',
      direction: 'asc',
    });
  });

  it('persists positionsSideFilter via setProLayoutPreferences', () => {
    mockUseSelector.mockReturnValue('all');

    const { result } = renderHook(() => usePerpsProPositionsPreferences());

    act(() => {
      result.current.setSideFilter('short');
    });

    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledWith({ positionsSideFilter: 'short' });
  });

  it('maps nested sortConfig to flat controller fields on write', () => {
    mockUseSelector.mockReturnValue({
      field: 'positionValue',
      direction: 'desc',
    });

    const { result } = renderHook(() => usePerpsProPositionsPreferences());

    act(() => {
      result.current.setSortConfig({
        field: 'fundingRate',
        direction: 'asc',
      });
    });

    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledWith({
      positionsSortField: 'fundingRate',
      positionsSortDirection: 'asc',
    });
  });
});
