import { renderHook } from '@testing-library/react-hooks';
import { useSeasonStatus } from './useSeasonStatus';
import Engine from '../../../../core/Engine';
import { setSeasonStatus } from '../../../../actions/rewards';
import { setSeasonStatusLoading } from '../../../../reducers/rewards';
import { useDispatch, useSelector } from 'react-redux';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectSeasonId: jest.fn(),
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
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    // Mock useSelector calls in order: first call is seasonId, second is subscriptionId
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'test-season-id'; // selectSeasonId
      }
      if (callCount === 2) {
        return 'test-subscription-id'; // selectRewardsSubscriptionId
      }
      return null;
    });
  });

  it('should return void', () => {
    const { result } = renderHook(() => useSeasonStatus());
    expect(result.current).toBeUndefined();
  });

  it('should skip fetch when subscriptionId is missing', () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return 'test-season-id'; // selectSeasonId
      }
      if (callCount === 2) {
        return null; // selectRewardsSubscriptionId - missing
      }
      return null;
    });

    renderHook(() => useSeasonStatus());

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    expect(mockEngineCall).not.toHaveBeenCalled();
  });

  it('should fetch season status successfully', async () => {
    const mockStatusData = {
      season: {
        id: 'season-1',
        name: 'Test Season',
        startDate: 1640995200000,
        endDate: 1672531200000,
        tiers: [],
      },
      balance: {
        total: 100,
        refereePortion: 20,
        updatedAt: 1640995200000,
      },
      tier: {
        currentTier: { id: 'bronze', name: 'Bronze', pointsNeeded: 0 },
        nextTier: { id: 'silver', name: 'Silver', pointsNeeded: 100 },
        nextTierPointsNeeded: 50,
      },
    };

    mockEngineCall.mockResolvedValueOnce(mockStatusData);

    renderHook(() => useSeasonStatus());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getSeasonStatus',
      'test-subscription-id',
      'test-season-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(mockStatusData));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = new Error('Fetch failed');
    mockEngineCall.mockRejectedValueOnce(mockError);

    renderHook(() => useSeasonStatus());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getSeasonStatus',
      'test-subscription-id',
      'test-season-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
  });

  it('should use current as fallback when seasonId is null', async () => {
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return null; // selectSeasonId - null
      }
      if (callCount === 2) {
        return 'test-subscription-id'; // selectRewardsSubscriptionId
      }
      return null;
    });

    const mockStatusData = {
      season: {
        id: 'current',
        name: 'Current Season',
        startDate: 1640995200000,
        endDate: 1672531200000,
        tiers: [],
      },
      balance: {
        total: 0,
        refereePortion: 0,
      },
      tier: {
        currentTier: { id: 'bronze', name: 'Bronze', pointsNeeded: 0 },
        nextTier: null,
        nextTierPointsNeeded: null,
      },
    };
    mockEngineCall.mockResolvedValueOnce(mockStatusData);

    renderHook(() => useSeasonStatus());

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getSeasonStatus',
      'test-subscription-id',
      'current',
    );
  });
});
