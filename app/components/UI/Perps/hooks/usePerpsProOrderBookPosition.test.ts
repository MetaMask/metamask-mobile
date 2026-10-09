import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsProOrderBookPosition } from './usePerpsProOrderBookPosition';
import { selectPerpsProOrderBookPosition } from '../selectors/perpsController';

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

describe('usePerpsProOrderBookPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the side from the selectPerpsProOrderBookPosition selector', () => {
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsProOrderBookPosition ? 'right' : undefined,
    );

    const { result } = renderHook(() => usePerpsProOrderBookPosition());

    expect(result.current.orderBookPosition).toBe('right');
  });

  it.each(['left', 'right'] as const)(
    'persists orderBookPosition=%s via setProLayoutPreferences',
    (position) => {
      mockUseSelector.mockReturnValue('left');

      const { result } = renderHook(() => usePerpsProOrderBookPosition());

      act(() => {
        result.current.setOrderBookPosition(position);
      });

      expect(
        Engine.context.PerpsController.setProLayoutPreferences,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.PerpsController.setProLayoutPreferences,
      ).toHaveBeenCalledWith({ orderBookPosition: position });
    },
  );

  it('patches only orderBookPosition so sibling preferences survive', () => {
    mockUseSelector.mockReturnValue('left');

    const { result } = renderHook(() => usePerpsProOrderBookPosition());

    act(() => {
      result.current.setOrderBookPosition('right');
    });

    const [patch] = jest.mocked(
      Engine.context.PerpsController.setProLayoutPreferences,
    ).mock.calls[0];
    expect(Object.keys(patch)).toEqual(['orderBookPosition']);
  });
});
