import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsProChartExpanded } from './usePerpsProChartExpanded';
import { selectPerpsProChartExpanded } from '../selectors/perpsController';

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

describe('usePerpsProChartExpanded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expanded state from the selectPerpsProChartExpanded selector', () => {
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsProChartExpanded ? true : undefined,
    );

    const { result } = renderHook(() => usePerpsProChartExpanded());

    expect(result.current.isChartExpanded).toBe(true);
  });

  it('persists chartExpanded=true via setProLayoutPreferences', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => usePerpsProChartExpanded());

    act(() => {
      result.current.setChartExpanded(true);
    });

    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledWith({ chartExpanded: true });
  });

  it('persists chartExpanded=false via setProLayoutPreferences', () => {
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => usePerpsProChartExpanded());

    act(() => {
      result.current.setChartExpanded(false);
    });

    expect(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).toHaveBeenCalledWith({ chartExpanded: false });
  });
});
