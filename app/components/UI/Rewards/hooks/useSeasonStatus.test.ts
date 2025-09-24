import { renderHook } from '@testing-library/react-hooks';
import { useSeasonStatus } from './useSeasonStatus';
import Engine from '../../../../core/Engine';
import { setSeasonStatus } from '../../../../actions/rewards';
import { setSeasonStatusLoading } from '../../../../reducers/rewards';
import { useDispatch, useSelector } from 'react-redux';
import { CURRENT_SEASON_ID } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useFocusEffect } from '@react-navigation/native';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../actions/rewards', () => ({
  setSeasonStatus: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setSeasonStatusLoading: jest.fn(),
}));

// Mock the useInvalidateByRewardEvents hook
const mockUseInvalidateByRewardEvents = jest.fn();
jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: mockUseInvalidateByRewardEvents,
}));

// Mock React Navigation hooks
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

describe('useSeasonStatus', () => {
  const mockDispatch = jest.fn();
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
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
    mockUseSelector.mockReturnValue('test-subscription-id'); // selectRewardsSubscriptionId

    // Reset the mocked hooks
    mockUseFocusEffect.mockClear();
    mockUseInvalidateByRewardEvents.mockImplementation(() => {
      // Mock implementation
    });
  });

  it('should skip fetch when subscriptionId is missing', () => {
    mockUseSelector.mockReturnValue(null); // selectRewardsSubscriptionId - missing

    renderHook(() => useSeasonStatus());

    // Verify that the focus effect callback was registered
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();

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
        currentTier: {
          id: 'bronze',
          name: 'Bronze',
          pointsNeeded: 0,
          image: {
            lightModeUrl: 'bronze-light',
            darkModeUrl: 'bronze-dark',
          },
          levelNumber: '1',
          rewards: [],
        },
        nextTier: {
          id: 'silver',
          name: 'Silver',
          pointsNeeded: 100,
          image: {
            lightModeUrl: 'silver-light',
            darkModeUrl: 'silver-dark',
          },
          levelNumber: '2',
          rewards: [],
        },
        nextTierPointsNeeded: 50,
      },
    };

    mockEngineCall.mockResolvedValueOnce(mockStatusData);

    renderHook(() => useSeasonStatus());

    // Verify that the focus effect callback was registered
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getSeasonStatus',
      'test-subscription-id',
      CURRENT_SEASON_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(mockStatusData));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
  });

  it('should handle fetch errors gracefully', async () => {
    const mockError = new Error('Fetch failed');
    mockEngineCall.mockRejectedValueOnce(mockError);

    renderHook(() => useSeasonStatus());

    // Verify that the focus effect callback was registered
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getSeasonStatus',
      'test-subscription-id',
      CURRENT_SEASON_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
  });

  it('should register focus effect callback', () => {
    renderHook(() => useSeasonStatus());

    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should prevent duplicate fetch calls when already loading', async () => {
    // First call will start loading
    mockEngineCall.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves
        }),
    ); // Never resolves

    renderHook(() => useSeasonStatus());

    // Verify that the focus effect callback was registered
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

    // Trigger focus effect callback multiple times
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    focusCallback();
    focusCallback();

    // Should only be called once despite multiple focus triggers
    expect(mockEngineCall).toHaveBeenCalledTimes(1);
  });
});
