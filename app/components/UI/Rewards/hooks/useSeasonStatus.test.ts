import { renderHook } from '@testing-library/react-hooks';
import { useSeasonStatus } from './useSeasonStatus';
import Engine from '../../../../core/Engine';
import {
  setSeasonStatus,
  setSeasonStatusError,
} from '../../../../actions/rewards';
import {
  resetRewardsState,
  setCandidateSubscriptionId,
  setSeasonStatusLoading,
} from '../../../../reducers/rewards';
import { useDispatch, useSelector } from 'react-redux';
import { CURRENT_SEASON_ID } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  ParamListBase,
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { handleRewardsErrorMessage } from '../utils';
import { AuthorizationFailedError } from '../../../../core/Engine/controllers/rewards-controller/services/rewards-data-service';
import { strings } from '../../../../../locales/i18n';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

// Import the actual selectors for comparison in tests

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
  selectSeasonStatusError: jest.fn(),
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
  setSeasonStatusError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  resetRewardsState: jest.fn(),
  setCandidateSubscriptionId: jest.fn(),
  setSeasonStatusLoading: jest.fn(),
}));

// Mock the useInvalidateByRewardEvents hook
const mockUseInvalidateByRewardEvents = jest.fn();
jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: mockUseInvalidateByRewardEvents,
}));

// Mock React Navigation hooks
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: jest.fn(),
}));

// Mock utility functions
jest.mock('../utils', () => ({
  handleRewardsErrorMessage: jest.fn(),
}));

// Mock constants
jest.mock('../../../../constants/navigation/Routes', () => ({
  MODAL: {
    REWARDS_BOTTOM_SHEET_MODAL: 'RewardsBottomSheetModal',
  },
}));

// Mock strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

// Mock design system
jest.mock('@metamask/design-system-react-native', () => ({
  ButtonVariant: {
    Primary: 'Primary',
  },
}));

describe('useSeasonStatus', () => {
  const mockDispatch = jest.fn();
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
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
  const mockHandleRewardsErrorMessage =
    handleRewardsErrorMessage as jest.MockedFunction<
      typeof handleRewardsErrorMessage
    >;
  const mockStrings = strings as jest.MockedFunction<typeof strings>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mocks to ensure clean state
    mockUseDispatch.mockReset();
    mockUseSelector.mockReset();
    mockUseFocusEffect.mockReset();
    mockUseNavigation.mockReset();
    mockEngineCall.mockReset();
    mockHandleRewardsErrorMessage.mockReset();
    mockStrings.mockReset();
    mockUseInvalidateByRewardEvents.mockReset();

    // Set up default mock implementations
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Default selector returns - using mockImplementation for consistency
    mockUseSelector
      .mockReturnValueOnce('test-subscription-id') // selectRewardsSubscriptionId
      .mockReturnValueOnce(null); // selectSeasonStatusError

    // Mock navigation
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as unknown as NavigationProp<ParamListBase>);

    // Mock strings
    mockStrings.mockImplementation((key: string) => `mocked_${key}`);

    // Mock error message handler
    mockHandleRewardsErrorMessage.mockReturnValue('Mocked error message');

    // Mock the invalidate hook
    mockUseInvalidateByRewardEvents.mockImplementation(() => {
      // Mock implementation - no return needed as it's a void function
    });
  });

  it('should skip fetch when subscriptionId is missing', () => {
    // Reset and override the selector for this specific test
    mockUseSelector
      .mockReset()
      .mockReturnValueOnce(null) // selectRewardsSubscriptionId - missing
      .mockReturnValueOnce(null); // selectSeasonStatusError

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

  it('should fetch season status successfully and dispatch loading states', async () => {
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
    await focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
    expect(mockEngineCall).toHaveBeenCalledWith(
      'RewardsController:getSeasonStatus',
      'test-subscription-id',
      CURRENT_SEASON_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(mockStatusData));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusError(null));
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
  });

  it('should handle fetch errors gracefully and dispatch error state', async () => {
    const mockError = new Error('Fetch failed');
    mockEngineCall.mockRejectedValueOnce(mockError);

    renderHook(() => useSeasonStatus());

    // Verify that the focus effect callback was registered
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
    expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
    expect(mockDispatch).toHaveBeenCalledWith(
      setSeasonStatusError('Mocked error message'),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
  });

  it('should handle 403 errors by resetting rewards state and setting candidate subscription to retry', async () => {
    const mock403Error = new AuthorizationFailedError('403 Forbidden');
    mockEngineCall.mockRejectedValueOnce(mock403Error);

    renderHook(() => useSeasonStatus());

    // Verify that the focus effect callback was registered
    expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));

    // Execute the focus effect callback to trigger the fetch logic
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await focusCallback();

    expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
    expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
    expect(mockDispatch).toHaveBeenCalledWith(
      setCandidateSubscriptionId('retry'),
    );
    expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mock403Error);
    expect(mockDispatch).toHaveBeenCalledWith(
      setSeasonStatusError('Mocked error message'),
    );
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

  describe('loading state management', () => {
    it('should set loading to true at start of fetch', async () => {
      const mockStatusData = { season: { id: 'test' } };
      mockEngineCall.mockResolvedValueOnce(mockStatusData);

      renderHook(() => useSeasonStatus());

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Assert - loading should be set to true immediately
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
    });

    it('should set loading to false after successful fetch', async () => {
      const mockStatusData = { season: { id: 'test' } };
      mockEngineCall.mockResolvedValueOnce(mockStatusData);

      renderHook(() => useSeasonStatus());

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert - loading should be set to false after completion
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });

    it('should set loading to false after failed fetch', async () => {
      const mockError = new Error('Fetch failed');
      mockEngineCall.mockRejectedValueOnce(mockError);

      renderHook(() => useSeasonStatus());

      // Trigger fetch
      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert - loading should be set to false after error
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });
  });
});
