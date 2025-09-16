import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  selectActiveTab,
  selectReferralCode,
  selectBalanceTotal,
  selectReferralCount,
  selectCurrentTier,
  selectNextTier,
  selectNextTierPointsNeeded,
  selectBalanceRefereePortion,
  selectBalanceUpdatedAt,
  selectSeasonStatusLoading,
  selectSeasonId,
  selectSeasonName,
  selectSeasonStartDate,
  selectSeasonEndDate,
  selectSeasonTiers,
  selectOnboardingActiveStep,
  selectGeoLocation,
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
  selectReferralDetailsLoading,
  selectCandidateSubscriptionId,
  selectHideUnlinkedAccountsBanner,
  selectActiveBoosts,
  selectActiveBoostsLoading,
  selectActiveBoostsError,
} from './selectors';
import { OnboardingStep } from './types';
import { SeasonTierDto } from '../../core/Engine/controllers/rewards-controller/types';
import { RootState } from '../index';
import { RewardsState } from './index';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockedUseSelector = useSelector as jest.MockedFunction<
  typeof useSelector
>;

describe('Rewards selectors', () => {
  // Helper function to create mock root state
  const createMockRootState = (
    rewardsState: Partial<RewardsState>,
  ): RootState => ({ rewards: rewardsState } as RootState);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectActiveTab', () => {
    it('returns null when activeTab is null', () => {
      const mockState = { rewards: { activeTab: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveTab));
      expect(result.current).toBeNull();
    });

    it('returns overview tab when set', () => {
      const mockState = { rewards: { activeTab: 'overview' as const } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveTab));
      expect(result.current).toBe('overview');
    });

    it('returns activity tab when set', () => {
      const mockState = { rewards: { activeTab: 'activity' as const } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveTab));
      expect(result.current).toBe('activity');
    });

    it('returns levels tab when set', () => {
      const mockState = { rewards: { activeTab: 'levels' as const } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveTab));
      expect(result.current).toBe('levels');
    });
  });

  describe('selectReferralCode', () => {
    it('returns null when referral code is not set', () => {
      const mockState = { rewards: { referralCode: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectReferralCode));
      expect(result.current).toBeNull();
    });

    it('returns referral code when set', () => {
      const mockState = { rewards: { referralCode: 'ABC123' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectReferralCode));
      expect(result.current).toBe('ABC123');
    });
  });

  describe('selectBalanceTotal', () => {
    it('returns null when balance total is null', () => {
      const mockState = { rewards: { balanceTotal: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectBalanceTotal));
      expect(result.current).toBeNull();
    });

    it('returns balance total when set', () => {
      const mockState = { rewards: { balanceTotal: 1500.75 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectBalanceTotal));
      expect(result.current).toBe(1500.75);
    });

    it('returns zero balance when set to zero', () => {
      const mockState = { rewards: { balanceTotal: 0 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectBalanceTotal));
      expect(result.current).toBe(0);
    });
  });

  describe('selectReferralCount', () => {
    it('returns referee count', () => {
      const mockState = { rewards: { refereeCount: 5 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectReferralCount));
      expect(result.current).toBe(5);
    });

    it('returns zero when no referrals', () => {
      const mockState = { rewards: { refereeCount: 0 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectReferralCount));
      expect(result.current).toBe(0);
    });
  });

  describe('selectCurrentTier', () => {
    it('returns null when current tier is not set', () => {
      const mockState = { rewards: { currentTier: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectCurrentTier));
      expect(result.current).toBeNull();
    });

    it('returns current tier when set', () => {
      const mockTier: SeasonTierDto = {
        id: 'tier1',
        name: 'Bronze',
        pointsNeeded: 100,
      };
      const mockState = { rewards: { currentTier: mockTier } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectCurrentTier));
      expect(result.current).toEqual(mockTier);
    });
  });

  describe('selectNextTier', () => {
    it('returns null when next tier is not set', () => {
      const mockState = { rewards: { nextTier: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectNextTier));
      expect(result.current).toBeNull();
    });

    it('returns next tier when set', () => {
      const mockTier: SeasonTierDto = {
        id: 'tier2',
        name: 'Silver',
        pointsNeeded: 500,
      };
      const mockState = { rewards: { nextTier: mockTier } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectNextTier));
      expect(result.current).toEqual(mockTier);
    });
  });

  describe('selectNextTierPointsNeeded', () => {
    it('returns null when points needed is not set', () => {
      const mockState = { rewards: { nextTierPointsNeeded: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectNextTierPointsNeeded),
      );
      expect(result.current).toBeNull();
    });

    it('returns points needed when set', () => {
      const mockState = { rewards: { nextTierPointsNeeded: 250 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectNextTierPointsNeeded),
      );
      expect(result.current).toBe(250);
    });

    it('returns zero points needed when set to zero', () => {
      const mockState = { rewards: { nextTierPointsNeeded: 0 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectNextTierPointsNeeded),
      );
      expect(result.current).toBe(0);
    });
  });

  describe('selectBalanceRefereePortion', () => {
    it('returns null when referee portion is null', () => {
      const mockState = { rewards: { balanceRefereePortion: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectBalanceRefereePortion),
      );
      expect(result.current).toBeNull();
    });

    it('returns referee portion when set', () => {
      const mockState = { rewards: { balanceRefereePortion: 750.5 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectBalanceRefereePortion),
      );
      expect(result.current).toBe(750.5);
    });

    it('returns zero referee portion when set to zero', () => {
      const mockState = { rewards: { balanceRefereePortion: 0 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectBalanceRefereePortion),
      );
      expect(result.current).toBe(0);
    });
  });

  describe('selectBalanceUpdatedAt', () => {
    it('returns null when balance updated at is not set', () => {
      const mockState = { rewards: { balanceUpdatedAt: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectBalanceUpdatedAt));
      expect(result.current).toBeNull();
    });

    it('returns balance updated at date when set', () => {
      const mockDate = new Date('2024-01-15T10:30:00Z');
      const mockState = { rewards: { balanceUpdatedAt: mockDate } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectBalanceUpdatedAt));
      expect(result.current).toEqual(mockDate);
    });
  });

  describe('selectSeasonStatusLoading', () => {
    it('returns false when season status is not loading', () => {
      const mockState = { rewards: { seasonStatusLoading: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonStatusLoading),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when season status is loading', () => {
      const mockState = { rewards: { seasonStatusLoading: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonStatusLoading),
      );
      expect(result.current).toBe(true);
    });
  });

  describe('selectSeasonId', () => {
    it('returns null when season ID is not set', () => {
      const mockState = { rewards: { seasonId: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonId));
      expect(result.current).toBeNull();
    });

    it('returns undefined when season ID is undefined', () => {
      const mockState = { rewards: { seasonId: undefined } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonId));
      expect(result.current).toBeUndefined();
    });

    it('returns season ID when set', () => {
      const mockState = { rewards: { seasonId: 'season-2024-summer' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonId));
      expect(result.current).toBe('season-2024-summer');
    });

    it('returns numeric season ID when set as number', () => {
      const mockState = { rewards: { seasonId: 123 } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonId));
      expect(result.current).toBe(123);
    });
  });

  describe('selectSeasonName', () => {
    it('returns null when season name is not set', () => {
      const mockState = { rewards: { seasonName: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonName));
      expect(result.current).toBeNull();
    });

    it('returns season name when set', () => {
      const mockState = { rewards: { seasonName: 'Summer 2024' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonName));
      expect(result.current).toBe('Summer 2024');
    });
  });

  describe('selectSeasonStartDate', () => {
    it('returns null when season start date is not set', () => {
      const mockState = { rewards: { seasonStartDate: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonStartDate));
      expect(result.current).toBeNull();
    });

    it('returns season start date when set', () => {
      const mockDate = new Date('2024-06-01T00:00:00Z');
      const mockState = { rewards: { seasonStartDate: mockDate } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonStartDate));
      expect(result.current).toEqual(mockDate);
    });
  });

  describe('selectSeasonEndDate', () => {
    it('returns null when season end date is not set', () => {
      const mockState = { rewards: { seasonEndDate: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonEndDate));
      expect(result.current).toBeNull();
    });

    it('returns season end date when set', () => {
      const mockDate = new Date('2024-08-31T23:59:59Z');
      const mockState = { rewards: { seasonEndDate: mockDate } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonEndDate));
      expect(result.current).toEqual(mockDate);
    });
  });

  describe('selectSeasonTiers', () => {
    it('returns empty array when season tiers are not set', () => {
      const mockState = { rewards: { seasonTiers: [] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonTiers));
      expect(result.current).toEqual([]);
    });

    it('returns season tiers when set', () => {
      const mockTiers: SeasonTierDto[] = [
        {
          id: 'bronze',
          name: 'Bronze',
          pointsNeeded: 100,
        },
        {
          id: 'silver',
          name: 'Silver',
          pointsNeeded: 500,
        },
        {
          id: 'gold',
          name: 'Gold',
          pointsNeeded: 1000,
        },
      ];
      const mockState = { rewards: { seasonTiers: mockTiers } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonTiers));
      expect(result.current).toEqual(mockTiers);
    });
  });

  describe('selectOnboardingActiveStep', () => {
    it('returns INTRO step when set', () => {
      const mockState = {
        rewards: { onboardingActiveStep: OnboardingStep.INTRO },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOnboardingActiveStep),
      );
      expect(result.current).toBe(OnboardingStep.INTRO);
    });

    it('returns STEP_1 when set', () => {
      const mockState = {
        rewards: { onboardingActiveStep: OnboardingStep.STEP_1 },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOnboardingActiveStep),
      );
      expect(result.current).toBe(OnboardingStep.STEP_1);
    });

    it('returns STEP_2 when set', () => {
      const mockState = {
        rewards: { onboardingActiveStep: OnboardingStep.STEP_2 },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOnboardingActiveStep),
      );
      expect(result.current).toBe(OnboardingStep.STEP_2);
    });

    it('returns STEP_3 when set', () => {
      const mockState = {
        rewards: { onboardingActiveStep: OnboardingStep.STEP_3 },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOnboardingActiveStep),
      );
      expect(result.current).toBe(OnboardingStep.STEP_3);
    });

    it('returns STEP_4 when set', () => {
      const mockState = {
        rewards: { onboardingActiveStep: OnboardingStep.STEP_4 },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOnboardingActiveStep),
      );
      expect(result.current).toBe(OnboardingStep.STEP_4);
    });
  });

  describe('selectGeoLocation', () => {
    it('returns null when geo location is not set', () => {
      const mockState = { rewards: { geoLocation: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectGeoLocation));
      expect(result.current).toBeNull();
    });

    it('returns geo location when set', () => {
      const mockState = { rewards: { geoLocation: 'US' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectGeoLocation));
      expect(result.current).toBe('US');
    });
  });

  describe('selectOptinAllowedForGeo', () => {
    it('returns false when opt-in is not allowed for geo', () => {
      const mockState = { rewards: { optinAllowedForGeo: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOptinAllowedForGeo),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when opt-in is allowed for geo', () => {
      const mockState = { rewards: { optinAllowedForGeo: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOptinAllowedForGeo),
      );
      expect(result.current).toBe(true);
    });
  });

  describe('selectOptinAllowedForGeoLoading', () => {
    it('returns false when geo check is not loading', () => {
      const mockState = { rewards: { optinAllowedForGeoLoading: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOptinAllowedForGeoLoading),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when geo check is loading', () => {
      const mockState = { rewards: { optinAllowedForGeoLoading: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOptinAllowedForGeoLoading),
      );
      expect(result.current).toBe(true);
    });
  });

  describe('selectReferralDetailsLoading', () => {
    it('returns false when referral details are not loading', () => {
      const mockState = { rewards: { referralDetailsLoading: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectReferralDetailsLoading),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when referral details are loading', () => {
      const mockState = { rewards: { referralDetailsLoading: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectReferralDetailsLoading),
      );
      expect(result.current).toBe(true);
    });
  });

  describe('selectCandidateSubscriptionId', () => {
    it('returns null when candidate subscription ID is null', () => {
      const mockState = { rewards: { candidateSubscriptionId: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectCandidateSubscriptionId),
      );
      expect(result.current).toBeNull();
    });

    it('returns pending when candidate subscription ID is pending', () => {
      const mockState = { rewards: { candidateSubscriptionId: 'pending' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectCandidateSubscriptionId),
      );
      expect(result.current).toBe('pending');
    });

    it('returns error when candidate subscription ID is error', () => {
      const mockState = { rewards: { candidateSubscriptionId: 'error' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectCandidateSubscriptionId),
      );
      expect(result.current).toBe('error');
    });

    it('returns subscription ID when set to a string', () => {
      const mockState = { rewards: { candidateSubscriptionId: 'sub-12345' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectCandidateSubscriptionId),
      );
      expect(result.current).toBe('sub-12345');
    });
  });

  describe('selectHideUnlinkedAccountsBanner', () => {
    it('returns false when banner should be shown', () => {
      const mockState = { rewards: { hideUnlinkedAccountsBanner: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideUnlinkedAccountsBanner),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when banner should be hidden', () => {
      const mockState = { rewards: { hideUnlinkedAccountsBanner: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideUnlinkedAccountsBanner),
      );
      expect(result.current).toBe(true);
    });
  });

  describe('selectCurrentSeasonId', () => {
    it('returns null when season ID is null', () => {
      const mockState = { rewards: { seasonId: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonId));
      expect(result.current).toBeNull();
    });

    it('returns season ID when set', () => {
      const mockState = { rewards: { seasonId: 'season-123' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonId));
      expect(result.current).toBe('season-123');
    });

    it('returns different season IDs correctly', () => {
      const mockState = { rewards: { seasonId: 'winter-2024' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonId));
      expect(result.current).toBe('winter-2024');
    });
  });

  describe('selectActiveBoosts', () => {
    it('returns empty array when no boosts', () => {
      const mockState = { rewards: { activeBoosts: [] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveBoosts));
      expect(result.current).toEqual([]);
    });

    it('returns active boosts array when set', () => {
      const mockBoosts = [
        {
          id: 'boost-1',
          name: 'Test Boost 1',
          icon: {
            lightModeUrl: 'light1.png',
            darkModeUrl: 'dark1.png',
          },
          boostBips: 1000,
          seasonLong: true,
          backgroundColor: '#FF0000',
        },
        {
          id: 'boost-2',
          name: 'Test Boost 2',
          icon: {
            lightModeUrl: 'light2.png',
            darkModeUrl: 'dark2.png',
          },
          boostBips: 500,
          seasonLong: false,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          backgroundColor: '#00FF00',
        },
      ];
      const mockState = { rewards: { activeBoosts: mockBoosts } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveBoosts));
      expect(result.current).toEqual(mockBoosts);
      expect(result.current).toHaveLength(2);
      expect(result.current?.[0]?.id).toBe('boost-1');
      expect(result.current?.[1]?.seasonLong).toBe(false);
    });

    it('returns single boost correctly', () => {
      const singleBoost = [
        {
          id: 'single-boost',
          name: 'Single Boost',
          icon: {
            lightModeUrl: 'single.png',
            darkModeUrl: 'single-dark.png',
          },
          boostBips: 2000,
          seasonLong: true,
          backgroundColor: '#0000FF',
        },
      ];
      const mockState = { rewards: { activeBoosts: singleBoost } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveBoosts));
      expect(result.current).toEqual(singleBoost);
      expect(result.current).toHaveLength(1);
      expect(result.current?.[0]?.name).toBe('Single Boost');
      expect(result.current?.[0]?.boostBips).toBe(2000);
    });
  });

  describe('selectActiveBoostsLoading', () => {
    it('returns false when not loading', () => {
      const mockState = { rewards: { activeBoostsLoading: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectActiveBoostsLoading),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when banner should be hidden', () => {
      const mockState = { rewards: { hideUnlinkedAccountsBanner: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideUnlinkedAccountsBanner),
      );
      expect(result.current).toBe(true);
    });
  });

  describe('selectActiveBoostsError', () => {
    it('returns false when no error', () => {
      const mockState = { rewards: { activeBoostsError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveBoostsError));
      expect(result.current).toBe(false);
    });

    it('returns true when error occurs', () => {
      const mockState = { rewards: { activeBoostsError: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectActiveBoostsError));
      expect(result.current).toBe(true);
    });

    it('handles error state changes correctly', () => {
      let mockState = { rewards: { activeBoostsError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectActiveBoostsError),
      );
      expect(result.current).toBe(false);

      // Change state to error
      mockState = { rewards: { activeBoostsError: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(true);

      // Change back to no error
      mockState = { rewards: { activeBoostsError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(false);
    });
  });

  // Direct selector tests (without useSelector hook)
  describe('Direct selector calls', () => {
    describe('selectActiveTab direct calls', () => {
      it('returns correct active tab directly', () => {
        const state = createMockRootState({ activeTab: 'activity' });
        expect(selectActiveTab(state)).toBe('activity');
      });

      it('returns null when activeTab is null directly', () => {
        const state = createMockRootState({ activeTab: null });
        expect(selectActiveTab(state)).toBeNull();
      });
    });

    describe('selectBalanceTotal direct calls', () => {
      it('returns correct balance total directly', () => {
        const state = createMockRootState({ balanceTotal: 2500 });
        expect(selectBalanceTotal(state)).toBe(2500);
      });

      it('returns null when balance is null directly', () => {
        const state = createMockRootState({ balanceTotal: null });
        expect(selectBalanceTotal(state)).toBeNull();
      });

      it('handles negative balance correctly', () => {
        const state = createMockRootState({ balanceTotal: -100 });
        expect(selectBalanceTotal(state)).toBe(-100);
      });
    });

    describe('selectReferralCount direct calls', () => {
      it('returns correct referral count directly', () => {
        const state = createMockRootState({ refereeCount: 42 });
        expect(selectReferralCount(state)).toBe(42);
      });

      it('handles zero referrals correctly', () => {
        const state = createMockRootState({ refereeCount: 0 });
        expect(selectReferralCount(state)).toBe(0);
      });

      it('handles large referral counts correctly', () => {
        const state = createMockRootState({ refereeCount: 9999 });
        expect(selectReferralCount(state)).toBe(9999);
      });
    });

    describe('selectSeasonTiers direct calls', () => {
      it('returns empty array when no tiers', () => {
        const state = createMockRootState({ seasonTiers: [] });
        expect(selectSeasonTiers(state)).toEqual([]);
      });

      it('returns single tier correctly', () => {
        const tier = { id: 'bronze', name: 'Bronze', pointsNeeded: 100 };
        const state = createMockRootState({ seasonTiers: [tier] });
        expect(selectSeasonTiers(state)).toEqual([tier]);
      });

      it('preserves tier order', () => {
        const tiers = [
          { id: 'bronze', name: 'Bronze', pointsNeeded: 0 },
          { id: 'silver', name: 'Silver', pointsNeeded: 100 },
          { id: 'gold', name: 'Gold', pointsNeeded: 500 },
          { id: 'platinum', name: 'Platinum', pointsNeeded: 1000 },
        ];
        const state = createMockRootState({ seasonTiers: tiers });
        expect(selectSeasonTiers(state)).toEqual(tiers);
        expect(selectSeasonTiers(state)[0].name).toBe('Bronze');
        expect(selectSeasonTiers(state)[3].name).toBe('Platinum');
      });
    });

    describe('selectCandidateSubscriptionId direct calls', () => {
      it('returns pending state correctly', () => {
        const state = createMockRootState({
          candidateSubscriptionId: 'pending',
        });
        expect(selectCandidateSubscriptionId(state)).toBe('pending');
      });

      it('returns error state correctly', () => {
        const state = createMockRootState({ candidateSubscriptionId: 'error' });
        expect(selectCandidateSubscriptionId(state)).toBe('error');
      });

      it('returns actual subscription ID correctly', () => {
        const state = createMockRootState({
          candidateSubscriptionId: 'subscription-uuid-12345',
        });
        expect(selectCandidateSubscriptionId(state)).toBe(
          'subscription-uuid-12345',
        );
      });

      it('returns null correctly', () => {
        const state = createMockRootState({ candidateSubscriptionId: null });
        expect(selectCandidateSubscriptionId(state)).toBeNull();
      });
    });

    describe('selectActiveBoostsError direct calls', () => {
      it('returns false when no error', () => {
        const state = createMockRootState({ activeBoostsError: false });
        expect(selectActiveBoostsError(state)).toBe(false);
      });

      it('returns true when error occurs', () => {
        const state = createMockRootState({ activeBoostsError: true });
        expect(selectActiveBoostsError(state)).toBe(true);
      });
    });
  });

  // Edge cases and error handling
  describe('Edge cases and error handling', () => {
    describe('Malformed state handling', () => {
      it('handles missing rewards state gracefully', () => {
        // Given a state without rewards property
        const invalidState = {} as RootState;

        // When/Then - should throw or handle gracefully depending on implementation
        expect(() => selectActiveTab(invalidState)).toThrow();
      });

      it('handles undefined rewards state', () => {
        const invalidState = { rewards: undefined } as unknown as RootState;
        expect(() => selectActiveTab(invalidState)).toThrow();
      });

      it('handles null rewards state', () => {
        const invalidState = { rewards: null } as unknown as RootState;
        expect(() => selectActiveTab(invalidState)).toThrow();
      });
    });

    describe('Date handling edge cases', () => {
      it('handles invalid date objects', () => {
        const state = createMockRootState({
          balanceUpdatedAt: new Date('invalid-date'),
          seasonStartDate: new Date('invalid-date'),
          seasonEndDate: new Date('invalid-date'),
        });

        expect(selectBalanceUpdatedAt(state)).toBeInstanceOf(Date);
        expect(selectSeasonStartDate(state)).toBeInstanceOf(Date);
        expect(selectSeasonEndDate(state)).toBeInstanceOf(Date);
      });

      it('handles null dates correctly', () => {
        const state = createMockRootState({
          balanceUpdatedAt: null,
          seasonStartDate: null,
          seasonEndDate: null,
        });

        expect(selectBalanceUpdatedAt(state)).toBeNull();
        expect(selectSeasonStartDate(state)).toBeNull();
        expect(selectSeasonEndDate(state)).toBeNull();
      });

      it('handles epoch dates correctly', () => {
        const epochDate = new Date(0);
        const state = createMockRootState({
          balanceUpdatedAt: epochDate,
          seasonStartDate: epochDate,
          seasonEndDate: epochDate,
        });

        expect(selectBalanceUpdatedAt(state)).toEqual(epochDate);
        expect(selectSeasonStartDate(state)).toEqual(epochDate);
        expect(selectSeasonEndDate(state)).toEqual(epochDate);
      });
    });

    describe('Numeric value edge cases', () => {
      it('handles zero values correctly', () => {
        const state = createMockRootState({
          balanceTotal: 0,
          balanceRefereePortion: 0,
          refereeCount: 0,
          nextTierPointsNeeded: 0,
        });

        expect(selectBalanceTotal(state)).toBe(0);
        expect(selectBalanceRefereePortion(state)).toBe(0);
        expect(selectReferralCount(state)).toBe(0);
        expect(selectNextTierPointsNeeded(state)).toBe(0);
      });

      it('handles negative values correctly', () => {
        const state = createMockRootState({
          balanceTotal: -100,
          balanceRefereePortion: -50,
          refereeCount: -1,
          nextTierPointsNeeded: -10,
        });

        expect(selectBalanceTotal(state)).toBe(-100);
        expect(selectBalanceRefereePortion(state)).toBe(-50);
        expect(selectReferralCount(state)).toBe(-1);
        expect(selectNextTierPointsNeeded(state)).toBe(-10);
      });

      it('handles very large numbers correctly', () => {
        const state = createMockRootState({
          balanceTotal: Number.MAX_SAFE_INTEGER,
          balanceRefereePortion: 999999999,
          refereeCount: 1000000,
          nextTierPointsNeeded: Number.MAX_SAFE_INTEGER,
        });

        expect(selectBalanceTotal(state)).toBe(Number.MAX_SAFE_INTEGER);
        expect(selectBalanceRefereePortion(state)).toBe(999999999);
        expect(selectReferralCount(state)).toBe(1000000);
        expect(selectNextTierPointsNeeded(state)).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('handles floating point numbers correctly', () => {
        const state = createMockRootState({
          balanceTotal: 123.456789,
          balanceRefereePortion: 67.89,
        });

        expect(selectBalanceTotal(state)).toBe(123.456789);
        expect(selectBalanceRefereePortion(state)).toBe(67.89);
      });
    });

    describe('String value edge cases', () => {
      it('handles empty strings correctly', () => {
        const state = createMockRootState({
          referralCode: '',
          seasonId: '',
          seasonName: '',
          geoLocation: '',
          candidateSubscriptionId: '',
        });

        expect(selectReferralCode(state)).toBe('');
        expect(selectSeasonId(state)).toBe('');
        expect(selectSeasonName(state)).toBe('');
        expect(selectGeoLocation(state)).toBe('');
        expect(selectCandidateSubscriptionId(state)).toBe('');
      });

      it('handles very long strings correctly', () => {
        const longString = 'a'.repeat(10000);
        const state = createMockRootState({
          referralCode: longString,
          seasonName: longString,
          geoLocation: longString,
        });

        expect(selectReferralCode(state)).toBe(longString);
        expect(selectSeasonName(state)).toBe(longString);
        expect(selectGeoLocation(state)).toBe(longString);
      });

      it('handles strings with special characters correctly', () => {
        const specialString = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const unicodeString = '🎉🌟✨🎊🎈';
        const state = createMockRootState({
          referralCode: specialString,
          seasonName: unicodeString,
          geoLocation: 'en-US',
        });

        expect(selectReferralCode(state)).toBe(specialString);
        expect(selectSeasonName(state)).toBe(unicodeString);
        expect(selectGeoLocation(state)).toBe('en-US');
      });
    });

    describe('Tier object edge cases', () => {
      it('handles tiers with missing properties gracefully', () => {
        const incompleteTier = {
          id: 'bronze',
          name: 'Bronze',
        } as SeasonTierDto;
        const state = createMockRootState({
          currentTier: incompleteTier,
          nextTier: incompleteTier,
          seasonTiers: [incompleteTier],
        });

        expect(selectCurrentTier(state)).toEqual(incompleteTier);
        expect(selectNextTier(state)).toEqual(incompleteTier);
        expect(selectSeasonTiers(state)).toEqual([incompleteTier]);
      });

      it('handles tiers with extra properties', () => {
        const extendedTier = {
          id: 'gold',
          name: 'Gold',
          pointsNeeded: 1000,
          extraProp: 'value',
          description: 'Golden tier',
        } as SeasonTierDto & { extraProp: string; description: string };

        const state = createMockRootState({
          currentTier: extendedTier,
          nextTier: extendedTier,
        });

        expect(selectCurrentTier(state)).toEqual(extendedTier);
        expect(selectNextTier(state)).toEqual(extendedTier);
      });
    });
  });

  // Performance and consistency tests
  describe('Performance and consistency', () => {
    describe('Selector consistency', () => {
      it('returns same reference for same input', () => {
        const tier = { id: 'silver', name: 'Silver', pointsNeeded: 500 };
        const state = createMockRootState({ currentTier: tier });

        const result1 = selectCurrentTier(state);
        const result2 = selectCurrentTier(state);

        expect(result1).toBe(result2); // Same reference
        expect(result1).toEqual(result2); // Same value
      });

      it('returns different references for different inputs', () => {
        const tier1 = { id: 'silver', name: 'Silver', pointsNeeded: 500 };
        const tier2 = { id: 'gold', name: 'Gold', pointsNeeded: 1000 };

        const state1 = createMockRootState({ currentTier: tier1 });
        const state2 = createMockRootState({ currentTier: tier2 });

        const result1 = selectCurrentTier(state1);
        const result2 = selectCurrentTier(state2);

        expect(result1).not.toBe(result2);
        expect(result1).not.toEqual(result2);
      });
    });

    describe('All selectors with comprehensive state', () => {
      const comprehensiveState = createMockRootState({
        activeTab: 'activity',
        seasonStatusLoading: true,
        seasonId: 'season-2024-q1',
        seasonName: 'Q1 2024 Season',
        seasonStartDate: new Date('2024-01-01'),
        seasonEndDate: new Date('2024-03-31'),
        seasonTiers: [
          { id: 'bronze', name: 'Bronze', pointsNeeded: 0 },
          { id: 'silver', name: 'Silver', pointsNeeded: 500 },
          { id: 'gold', name: 'Gold', pointsNeeded: 1500 },
        ],
        referralDetailsLoading: false,
        referralCode: 'REFER2024',
        refereeCount: 25,
        currentTier: { id: 'silver', name: 'Silver', pointsNeeded: 500 },
        nextTier: { id: 'gold', name: 'Gold', pointsNeeded: 1500 },
        nextTierPointsNeeded: 1000,
        balanceTotal: 2750.5,
        balanceRefereePortion: 1250.25,
        balanceUpdatedAt: new Date('2024-03-15T14:30:00Z'),
        onboardingActiveStep: OnboardingStep.STEP_3,
        candidateSubscriptionId: 'sub-candidate-12345',
        geoLocation: 'US-CA',
        optinAllowedForGeo: true,
        optinAllowedForGeoLoading: false,
        hideUnlinkedAccountsBanner: true,
        activeBoosts: [],
        activeBoostsLoading: false,
        activeBoostsError: false,
      });

      it('all selectors return expected values from comprehensive state', () => {
        expect(selectActiveTab(comprehensiveState)).toBe('activity');
        expect(selectSeasonStatusLoading(comprehensiveState)).toBe(true);
        expect(selectSeasonId(comprehensiveState)).toBe('season-2024-q1');
        expect(selectSeasonName(comprehensiveState)).toBe('Q1 2024 Season');
        expect(selectSeasonStartDate(comprehensiveState)).toEqual(
          new Date('2024-01-01'),
        );
        expect(selectSeasonEndDate(comprehensiveState)).toEqual(
          new Date('2024-03-31'),
        );
        expect(selectSeasonTiers(comprehensiveState)).toHaveLength(3);
        expect(selectReferralDetailsLoading(comprehensiveState)).toBe(false);
        expect(selectReferralCode(comprehensiveState)).toBe('REFER2024');
        expect(selectReferralCount(comprehensiveState)).toBe(25);
        expect(selectCurrentTier(comprehensiveState)?.name).toBe('Silver');
        expect(selectNextTier(comprehensiveState)?.name).toBe('Gold');
        expect(selectNextTierPointsNeeded(comprehensiveState)).toBe(1000);
        expect(selectBalanceTotal(comprehensiveState)).toBe(2750.5);
        expect(selectBalanceRefereePortion(comprehensiveState)).toBe(1250.25);
        expect(selectBalanceUpdatedAt(comprehensiveState)).toEqual(
          new Date('2024-03-15T14:30:00Z'),
        );
        expect(selectOnboardingActiveStep(comprehensiveState)).toBe(
          OnboardingStep.STEP_3,
        );
        expect(selectCandidateSubscriptionId(comprehensiveState)).toBe(
          'sub-candidate-12345',
        );
        expect(selectGeoLocation(comprehensiveState)).toBe('US-CA');
        expect(selectOptinAllowedForGeo(comprehensiveState)).toBe(true);
        expect(selectOptinAllowedForGeoLoading(comprehensiveState)).toBe(false);
        expect(selectHideUnlinkedAccountsBanner(comprehensiveState)).toBe(true);
        expect(selectActiveBoosts(comprehensiveState)).toEqual([]);
        expect(selectActiveBoostsLoading(comprehensiveState)).toBe(false);
        expect(selectActiveBoostsError(comprehensiveState)).toBe(false);
      });
      it('returns true when loading', () => {
        const mockState = { rewards: { activeBoostsLoading: true } };
        mockedUseSelector.mockImplementation((selector) => selector(mockState));

        const { result } = renderHook(() =>
          useSelector(selectActiveBoostsLoading),
        );
        expect(result.current).toBe(true);
      });

      it('handles loading state changes correctly', () => {
        let mockState = { rewards: { activeBoostsLoading: false } };
        mockedUseSelector.mockImplementation((selector) => selector(mockState));

        const { result, rerender } = renderHook(() =>
          useSelector(selectActiveBoostsLoading),
        );
        expect(result.current).toBe(false);

        // Change state to loading
        mockState = { rewards: { activeBoostsLoading: true } };
        mockedUseSelector.mockImplementation((selector) => selector(mockState));
        rerender();
        expect(result.current).toBe(true);
      });
    });
  });
});
