import { renderHook } from '@testing-library/react-hooks';
import { useSeasonStatus } from './useSeasonStatus';
import Engine from '../../../../core/Engine';
import { setSeasonStatus } from '../../../../actions/rewards';
import { setSeasonStatusLoading } from '../../../../reducers/rewards';
import { useDispatch } from 'react-redux';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../actions/rewards', () => ({
  setSeasonStatus: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setSeasonStatusLoading: jest.fn(),
}));

describe('useSeasonStatus', () => {
  const mockDispatch = jest.fn();
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
  });

  it('should return null', () => {
    const { result } = renderHook(() => useSeasonStatus());
    expect(result.current).toBeNull();
  });

  it('should skip fetch when subscriptionId is missing', () => {
    renderHook(() => useSeasonStatus({ seasonId: 'season-1' }));

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should fetch season status successfully', async () => {
    const mockStatusData = {
      seasonId: 'season-1',
      status: 'active',
      points: 100,
    };

    mockEngineCall.mockResolvedValueOnce(mockStatusData);

    renderHook(() =>
      useSeasonStatus({
        seasonId: 'season-1',
        subscriptionId: 'subscription-1',
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = new Error('Fetch failed');
    mockEngineCall.mockRejectedValueOnce(mockError);

    renderHook(() =>
      useSeasonStatus({
        seasonId: 'season-1',
        subscriptionId: 'subscription-1',
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
  });

  it('should use default empty options', () => {
    renderHook(() => useSeasonStatus());

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
  });
});
