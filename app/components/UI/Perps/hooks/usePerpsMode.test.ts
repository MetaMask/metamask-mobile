import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { PerpsMode } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsMode } from './usePerpsMode';
import { selectPerpsMode } from '../selectors/perpsController';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setPerpsMode: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current mode from the selectPerpsMode selector', () => {
    mockUseSelector.mockImplementation((selector) =>
      selector === selectPerpsMode ? PerpsMode.Pro : undefined,
    );

    const { result } = renderHook(() => usePerpsMode());

    expect(result.current.mode).toBe(PerpsMode.Pro);
  });

  it('persists the selected mode on PerpsController via setMode', () => {
    mockUseSelector.mockReturnValue(PerpsMode.Lite);

    const { result } = renderHook(() => usePerpsMode());

    act(() => {
      result.current.setMode(PerpsMode.Pro);
    });

    expect(Engine.context.PerpsController.setPerpsMode).toHaveBeenCalledTimes(
      1,
    );
    expect(Engine.context.PerpsController.setPerpsMode).toHaveBeenCalledWith(
      PerpsMode.Pro,
    );
  });
});
