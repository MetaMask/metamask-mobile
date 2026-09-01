import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsProOrderBookExpanded } from './usePerpsProOrderBookExpanded';
import { selectPerpsProOrderBookExpanded } from '../selectors/perpsController';

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

describe('usePerpsProOrderBookExpanded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns visibility from the selectPerpsProOrderBookExpanded selector', () => {
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsProOrderBookExpanded ? true : undefined,
    );

    const { result } = renderHook(() => usePerpsProOrderBookExpanded());

    expect(result.current.isOrderBookExpanded).toBe(true);
  });

  it.each([true, false])(
    'persists orderBookExpanded=%s via setProLayoutPreferences',
    (isExpanded) => {
      mockUseSelector.mockReturnValue(true);

      const { result } = renderHook(() => usePerpsProOrderBookExpanded());

      act(() => {
        result.current.setOrderBookExpanded(isExpanded);
      });

      expect(
        Engine.context.PerpsController.setProLayoutPreferences,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.PerpsController.setProLayoutPreferences,
      ).toHaveBeenCalledWith({ orderBookExpanded: isExpanded });
    },
  );

  it('patches only orderBookExpanded so sibling preferences survive', () => {
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => usePerpsProOrderBookExpanded());

    act(() => {
      result.current.setOrderBookExpanded(false);
    });

    const [patch] = jest.mocked(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).mock.calls[0];
    expect(Object.keys(patch)).toEqual(['orderBookExpanded']);
  });
});
