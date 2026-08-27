import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelectedOrderType } from './usePerpsSelectedOrderType';
import { selectPerpsSelectedOrderType } from '../selectors/perpsController';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setSelectedOrderType: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsSelectedOrderType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the selected order type from the selector', () => {
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsSelectedOrderType ? 'limit' : undefined,
    );

    const { result } = renderHook(() => usePerpsSelectedOrderType());

    expect(result.current.selectedOrderType).toBe('limit');
  });

  it('persists the selected order type via setSelectedOrderType', () => {
    mockUseSelector.mockReturnValue('market');

    const { result } = renderHook(() => usePerpsSelectedOrderType());

    act(() => {
      result.current.setSelectedOrderType('limit');
    });

    expect(
      Engine.context.PerpsController.setSelectedOrderType,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.PerpsController.setSelectedOrderType,
    ).toHaveBeenCalledWith('limit');
  });
});
