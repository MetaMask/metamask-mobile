import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import useRewardsVersionGuard from './useRewardsVersionGuard';
import Engine from '../../../../core/Engine';
import {
  setVersionGuardMinimumMobileVersion,
  setVersionGuardLoading,
  setVersionGuardError,
} from '../../../../reducers/rewards';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../reducers/rewards', () => ({
  setVersionGuardMinimumMobileVersion: jest.fn(),
  setVersionGuardLoading: jest.fn(),
  setVersionGuardError: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: jest.fn((fn) => fn),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const mockDispatch = jest.fn();
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

describe('useRewardsVersionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockEngineCall.mockResolvedValue({
      minimumMobileVersion: '7.50.0',
    });
  });

  it('fetches version requirements on focus', async () => {
    mockUseFocusEffect.mockImplementation((cb) => cb());

    renderHook(() => useRewardsVersionGuard());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getClientVersionRequirements',
    );
  });

  it('dispatches loading state and version during fetch', async () => {
    mockUseFocusEffect.mockImplementation((cb) => cb());

    renderHook(() => useRewardsVersionGuard());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockDispatch).toHaveBeenCalledWith(setVersionGuardLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(setVersionGuardError(false));
    expect(mockDispatch).toHaveBeenCalledWith(
      setVersionGuardMinimumMobileVersion('7.50.0'),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setVersionGuardLoading(false));
  });

  it('dispatches error state when fetch fails', async () => {
    mockUseFocusEffect.mockImplementation((cb) => cb());
    mockEngineCall.mockRejectedValue(new Error('Network error'));

    renderHook(() => useRewardsVersionGuard());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockDispatch).toHaveBeenCalledWith(setVersionGuardError(true));
    expect(mockDispatch).toHaveBeenCalledWith(setVersionGuardLoading(false));
  });

  it('returns fetchVersionRequirements function', () => {
    mockUseFocusEffect.mockImplementation(jest.fn());

    const { result } = renderHook(() => useRewardsVersionGuard());

    expect(result.current.fetchVersionRequirements).toBeInstanceOf(Function);
  });
});
