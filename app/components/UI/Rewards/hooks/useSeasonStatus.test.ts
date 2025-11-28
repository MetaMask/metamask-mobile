import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useSeasonStatus } from './useSeasonStatus';
import Engine from '../../../../core/Engine';
import {
  setSeasonStatus,
  setSeasonStatusError,
} from '../../../../actions/rewards';
import {
  setSeasonStatusLoading,
  resetRewardsState,
  setCandidateSubscriptionId,
} from '../../../../reducers/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { handleRewardsErrorMessage } from '../utils';
import { AuthorizationFailedError } from '../../../../core/Engine/controllers/rewards-controller/services/rewards-data-service';
import {
  SeasonDtoState,
  SeasonStatusState,
} from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../actions/rewards', () => ({
  setSeasonStatus: jest.fn(),
  setSeasonStatusError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setSeasonStatusLoading: jest.fn(),
  resetRewardsState: jest.fn(),
  setCandidateSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../utils', () => ({
  handleRewardsErrorMessage: jest.fn(),
}));

describe('useSeasonStatus', () => {
  const mockDispatch = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
    typeof useFocusEffect
  >;
  const mockUseInvalidateByRewardEvents =
    useInvalidateByRewardEvents as jest.MockedFunction<
      typeof useInvalidateByRewardEvents
    >;
  const mockHandleRewardsErrorMessage =
    handleRewardsErrorMessage as jest.MockedFunction<
      typeof handleRewardsErrorMessage
    >;

  const mockSubscriptionId = 'test-subscription-id';
  const mockSeasonId = 'test-season-id';
  const mockSeasonMetadata: SeasonDtoState = {
    id: mockSeasonId,
    name: 'Test Season',
    startDate: Date.now() - 86400000,
    endDate: Date.now() + 86400000,
    tiers: [],
    activityTypes: [],
  };

  const mockSeasonStatus: SeasonStatusState = {
    season: {
      id: mockSeasonId,
      name: 'Test Season',
      startDate: Date.now() - 86400000,
      endDate: Date.now() + 86400000,
      tiers: [],
      activityTypes: [],
    },
    balance: {
      total: 1000,
      updatedAt: Date.now(),
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
        pointsNeeded: 1000,
        image: {
          lightModeUrl: 'silver-light',
          darkModeUrl: 'silver-dark',
        },
        levelNumber: '2',
        rewards: [],
      },
      nextTierPointsNeeded: 1000,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockHandleRewardsErrorMessage.mockReturnValue('Error message');
  });

  describe('initialization', () => {
    it('returns fetchSeasonStatus function', () => {
      const { result } = renderHook(() => useSeasonStatus({}));

      expect(result.current).toEqual({
        fetchSeasonStatus: expect.any(Function),
      });
      expect(typeof result.current.fetchSeasonStatus).toBe('function');
    });

    it('registers focus effect callback when onlyForExplicitFetch is false', () => {
      renderHook(() => useSeasonStatus({ onlyForExplicitFetch: false }));

      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });

    it('does not call fetchSeasonStatus in focus effect when onlyForExplicitFetch is true', () => {
      renderHook(() => useSeasonStatus({ onlyForExplicitFetch: true }));

      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      focusCallback();

      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('calls fetchSeasonStatus in focus effect when onlyForExplicitFetch is false', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce(mockSeasonMetadata) // getSeasonMetadata
        .mockResolvedValueOnce(mockSeasonStatus); // getSeasonStatus

      renderHook(() => useSeasonStatus({ onlyForExplicitFetch: false }));

      const focusCallback = mockUseFocusEffect.mock.calls[0][0];
      await act(async () => {
        focusCallback();
      });

      expect(mockEngineCall).toHaveBeenCalled();
    });

    it('registers invalidate events when onlyForExplicitFetch is false', () => {
      renderHook(() => useSeasonStatus({ onlyForExplicitFetch: false }));

      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        [
          'RewardsController:accountLinked',
          'RewardsController:rewardClaimed',
          'RewardsController:balanceUpdated',
        ],
        expect.any(Function),
      );
    });

    it('registers empty invalidate events when onlyForExplicitFetch is true', () => {
      renderHook(() => useSeasonStatus({ onlyForExplicitFetch: true }));

      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
        [],
        expect.any(Function),
      );
    });
  });

  describe('fetchSeasonStatus - no subscriptionId', () => {
    it('sets season status to null and loading to false when subscriptionId is missing', async () => {
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('sets season status to null and loading to false when subscriptionId is undefined', async () => {
      mockUseSelector.mockReturnValue(undefined);

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatus(null));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
      expect(mockEngineCall).not.toHaveBeenCalled();
    });
  });

  describe('fetchSeasonStatus - active season', () => {
    it('fetches season status successfully with active season', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce(mockSeasonMetadata) // getSeasonMetadata for current
        .mockResolvedValueOnce(mockSeasonStatus); // getSeasonStatus

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonMetadata',
        'current',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonStatus',
        mockSubscriptionId,
        mockSeasonId,
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(mockSeasonStatus),
      );
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusError(null));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });
  });

  describe('fetchSeasonStatus - previous season', () => {
    it('fetches season status successfully with previous season when no active season', async () => {
      mockEngineCall
        .mockResolvedValueOnce(false) // hasActiveSeason = false
        .mockResolvedValueOnce(mockSeasonMetadata) // getSeasonMetadata for previous
        .mockResolvedValueOnce(mockSeasonStatus); // getSeasonStatus

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonMetadata',
        'previous',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getSeasonStatus',
        mockSubscriptionId,
        mockSeasonId,
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(mockSeasonStatus),
      );
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusError(null));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });
  });

  describe('fetchSeasonStatus - no season metadata', () => {
    it('handles error when no season metadata is found', async () => {
      mockEngineCall
        .mockResolvedValueOnce(false) // hasActiveSeason = false
        .mockResolvedValueOnce(null); // getSeasonMetadata returns null

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(
        expect.any(Error),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatusError('Error message'),
      );
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });
  });

  describe('fetchSeasonStatus - error handling', () => {
    it('handles general errors and dispatches error message', async () => {
      const mockError = new Error('Network error');
      mockEngineCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockRejectedValueOnce(mockError); // getSeasonMetadata fails

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatusError('Error message'),
      );
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });

    it('handles AuthorizationFailedError and resets rewards state', async () => {
      const mockError = new AuthorizationFailedError('Authorization failed');
      mockEngineCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockRejectedValueOnce(mockError); // getSeasonMetadata fails

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('retry'),
      );
      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatusError('Error message'),
      );
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });

    it('sets loading to false even when error occurs', async () => {
      const mockError = new Error('Network error');
      mockEngineCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockRejectedValueOnce(mockError); // getSeasonMetadata fails

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      // Verify loading is set to false in finally block
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });
  });

  describe('fetchSeasonStatus - loading state management', () => {
    it('sets loading to true at start and false after completion', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce(mockSeasonMetadata) // getSeasonMetadata
        .mockResolvedValueOnce(mockSeasonStatus); // getSeasonStatus

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      // Verify loading states are managed correctly
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(true));
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });

    it('sets loading to false even when error occurs', async () => {
      const mockError = new Error('Network error');
      mockEngineCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockRejectedValueOnce(mockError); // getSeasonMetadata fails

      const { result } = renderHook(() => useSeasonStatus({}));

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      // Verify loading is set to false after error
      expect(mockDispatch).toHaveBeenCalledWith(setSeasonStatusLoading(false));
    });
  });

  describe('explicit fetch behavior', () => {
    it('allows explicit fetch when onlyForExplicitFetch is true', async () => {
      mockEngineCall
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce(mockSeasonMetadata) // getSeasonMetadata
        .mockResolvedValueOnce(mockSeasonStatus); // getSeasonStatus

      const { result } = renderHook(() =>
        useSeasonStatus({ onlyForExplicitFetch: true }),
      );

      await act(async () => {
        await result.current.fetchSeasonStatus();
      });

      expect(mockEngineCall).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        setSeasonStatus(mockSeasonStatus),
      );
    });
  });
});
