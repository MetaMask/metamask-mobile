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
  selectSeasonStatusError,
  selectSeasonId,
  selectSeasonName,
  selectSeasonStartDate,
  selectSeasonEndDate,
  selectSeasonTiers,
  selectSeasonActivityTypes,
  selectOnboardingActiveStep,
  selectOnboardingReferralCode,
  selectGeoLocation,
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
  selectOptinAllowedForGeoError,
  selectReferralDetailsLoading,
  selectReferralDetailsError,
  selectCandidateSubscriptionId,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
  selectActiveBoosts,
  selectActiveBoostsLoading,
  selectActiveBoostsError,
  selectUnlockedRewards,
  selectUnlockedRewardLoading,
  selectUnlockedRewardError,
  selectSeasonRewardById,
  selectPointsEvents,
  selectSeasonShouldInstallNewVersion,
} from './selectors';
import { OnboardingStep } from './types';
import {
  RewardDto,
  SeasonTierDto,
  SeasonActivityTypeDto,
  PointsEventDto,
} from '../../core/Engine/controllers/rewards-controller/types';
import { RootState } from '..';
import { RewardsState, AccountOptInBannerInfoStatus } from '.';

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
  ): RootState => ({ rewards: rewardsState }) as RootState;

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
        image: {
          lightModeUrl: 'https://example.com/bronze-light.png',
          darkModeUrl: 'https://example.com/bronze-dark.png',
        },
        levelNumber: '1',
        rewards: [],
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
        image: {
          lightModeUrl: 'https://example.com/silver-light.png',
          darkModeUrl: 'https://example.com/silver-dark.png',
        },
        levelNumber: '2',
        rewards: [],
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

  describe('selectSeasonStatusError', () => {
    it('returns null when no season status error is set', () => {
      const mockState = { rewards: { seasonStatusError: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonStatusError));
      expect(result.current).toBeNull();
    });

    it('returns error message when season status error is set', () => {
      const errorMessage = 'Failed to fetch season status';
      const mockState = { rewards: { seasonStatusError: errorMessage } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonStatusError));
      expect(result.current).toBe(errorMessage);
    });

    it('returns timeout error message', () => {
      const timeoutError = 'Request timed out while fetching season status';
      const mockState = { rewards: { seasonStatusError: timeoutError } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonStatusError));
      expect(result.current).toBe(timeoutError);
    });

    it('returns API error message', () => {
      const apiError = 'API returned 500: Internal server error';
      const mockState = { rewards: { seasonStatusError: apiError } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonStatusError));
      expect(result.current).toBe(apiError);
    });

    it('returns network error message', () => {
      const networkError = 'Network connection failed';
      const mockState = { rewards: { seasonStatusError: networkError } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonStatusError));
      expect(result.current).toBe(networkError);
    });

    it('returns undefined when season status error is undefined', () => {
      const mockState = { rewards: { seasonStatusError: undefined } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonStatusError));
      expect(result.current).toBeUndefined();
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
          image: {
            lightModeUrl: 'https://example.com/bronze-light.png',
            darkModeUrl: 'https://example.com/bronze-dark.png',
          },
          levelNumber: '1',
          rewards: [],
        },
        {
          id: 'silver',
          name: 'Silver',
          pointsNeeded: 500,
          image: {
            lightModeUrl: 'https://example.com/silver-light.png',
            darkModeUrl: 'https://example.com/silver-dark.png',
          },
          levelNumber: '2',
          rewards: [],
        },
        {
          id: 'gold',
          name: 'Gold',
          pointsNeeded: 1000,
          image: {
            lightModeUrl: 'https://example.com/gold-light.png',
            darkModeUrl: 'https://example.com/gold-dark.png',
          },
          levelNumber: '3',
          rewards: [],
        },
      ];
      const mockState = { rewards: { seasonTiers: mockTiers } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectSeasonTiers));
      expect(result.current).toEqual(mockTiers);
    });
  });

  describe('selectSeasonActivityTypes', () => {
    it('returns empty array when season activity types are not set', () => {
      const mockState = { rewards: { seasonActivityTypes: [] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonActivityTypes),
      );
      expect(result.current).toEqual([]);
    });

    it('returns season activity types when set', () => {
      const mockActivityTypes: SeasonActivityTypeDto[] = [
        {
          type: 'SWAP',
          title: 'Swap',
          description: 'Swap tokens',
          icon: 'SwapVertical',
        },
        {
          type: 'CARD',
          title: 'Card spend',
          description: 'Spend with card',
          icon: 'Card',
        },
      ];
      const mockState = { rewards: { seasonActivityTypes: mockActivityTypes } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonActivityTypes),
      );
      expect(result.current).toEqual(mockActivityTypes);
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

  describe('selectOnboardingReferralCode', () => {
    it('returns null when onboarding referral code is not set', () => {
      const mockState = { rewards: { onboardingReferralCode: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOnboardingReferralCode),
      );
      expect(result.current).toBeNull();
    });

    it('returns onboarding referral code when set', () => {
      const mockState = { rewards: { onboardingReferralCode: 'ONBOARD123' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOnboardingReferralCode),
      );
      expect(result.current).toBe('ONBOARD123');
    });

    it('returns empty string when onboarding referral code is empty', () => {
      const mockState = { rewards: { onboardingReferralCode: '' } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOnboardingReferralCode),
      );
      expect(result.current).toBe('');
    });

    it('handles state changes correctly', () => {
      const mockState = { rewards: { onboardingReferralCode: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectOnboardingReferralCode),
      );
      expect(result.current).toBeNull();

      // Simulate state change: update onboardingReferralCode to a string
      const updatedState = {
        rewards: { onboardingReferralCode: 'UPDATED456' },
      };
      mockedUseSelector.mockImplementation((selector) =>
        selector(updatedState),
      );
      rerender();
      expect(result.current).toBe('UPDATED456');
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

  describe('selectOptinAllowedForGeoError', () => {
    it('returns false when there is no geo error', () => {
      const mockState = { rewards: { optinAllowedForGeoError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOptinAllowedForGeoError),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when there is a geo error', () => {
      const mockState = { rewards: { optinAllowedForGeoError: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectOptinAllowedForGeoError),
      );
      expect(result.current).toBe(true);
    });

    it('handles error state changes correctly', () => {
      let mockState = { rewards: { optinAllowedForGeoError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectOptinAllowedForGeoError),
      );
      expect(result.current).toBe(false);

      mockState = { rewards: { optinAllowedForGeoError: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(true);

      mockState = { rewards: { optinAllowedForGeoError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(false);
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

  describe('selectReferralDetailsError', () => {
    it('returns false when there is no referral details error', () => {
      const mockState = { rewards: { referralDetailsError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectReferralDetailsError),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when there is a referral details error', () => {
      const mockState = { rewards: { referralDetailsError: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectReferralDetailsError),
      );
      expect(result.current).toBe(true);
    });

    it('handles error state changes correctly', () => {
      let mockState = { rewards: { referralDetailsError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectReferralDetailsError),
      );
      expect(result.current).toBe(false);

      mockState = { rewards: { referralDetailsError: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(true);

      mockState = { rewards: { referralDetailsError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(false);
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

  describe('selectHideCurrentAccountNotOptedInBannerArray', () => {
    it('returns empty array when no accounts are configured', () => {
      const mockState = { rewards: { hideCurrentAccountNotOptedInBanner: [] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideCurrentAccountNotOptedInBannerArray),
      );
      expect(result.current).toEqual([]);
      expect(result.current).toHaveLength(0);
    });

    it('returns single account configuration when set', () => {
      const mockAccountConfig: AccountOptInBannerInfoStatus = {
        accountGroupId: 'keyring:wallet1/1',
        hide: true,
      };
      const mockState = {
        rewards: { hideCurrentAccountNotOptedInBanner: [mockAccountConfig] },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideCurrentAccountNotOptedInBannerArray),
      );
      expect(result.current).toEqual([mockAccountConfig]);
      expect(result.current).toHaveLength(1);
      expect(result.current?.[0]?.accountGroupId).toBe('keyring:wallet1/1');
      expect(result.current?.[0]?.hide).toBe(true);
    });

    it('returns multiple account configurations when set', () => {
      const mockAccountConfigs: AccountOptInBannerInfoStatus[] = [
        {
          accountGroupId: 'keyring:wallet1/1',
          hide: true,
        },
        {
          accountGroupId: 'keyring:wallet1/2',
          hide: false,
        },
        {
          accountGroupId: 'keyring:wallet2/1',
          hide: true,
        },
      ];
      const mockState = {
        rewards: { hideCurrentAccountNotOptedInBanner: mockAccountConfigs },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideCurrentAccountNotOptedInBannerArray),
      );
      expect(result.current).toEqual(mockAccountConfigs);
      expect(result.current).toHaveLength(3);
      expect(result.current?.[0]?.hide).toBe(true);
      expect(result.current?.[1]?.hide).toBe(false);
      expect(result.current?.[2]?.hide).toBe(true);
    });

    it('handles mixed hide states correctly', () => {
      const mockAccountConfigs: AccountOptInBannerInfoStatus[] = [
        {
          accountGroupId: 'keyring:wallet1/1',
          hide: false,
        },
        {
          accountGroupId: 'keyring:wallet1/2',
          hide: true,
        },
        {
          accountGroupId: 'keyring:wallet1/3',
          hide: false,
        },
      ];
      const mockState = {
        rewards: { hideCurrentAccountNotOptedInBanner: mockAccountConfigs },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideCurrentAccountNotOptedInBannerArray),
      );
      expect(result.current).toEqual(mockAccountConfigs);
      expect(result.current?.filter((config) => config.hide)).toHaveLength(1);
      expect(result.current?.filter((config) => !config.hide)).toHaveLength(2);
    });

    it('handles state changes correctly', () => {
      let mockState = {
        rewards: {
          hideCurrentAccountNotOptedInBanner:
            [] as AccountOptInBannerInfoStatus[],
        },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectHideCurrentAccountNotOptedInBannerArray),
      );
      expect(result.current).toEqual([]);

      // Change state to have account configs
      const newAccountConfigs: AccountOptInBannerInfoStatus[] = [
        {
          accountGroupId: 'keyring:wallet1/4',
          hide: true,
        },
      ];
      mockState = {
        rewards: { hideCurrentAccountNotOptedInBanner: newAccountConfigs },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toEqual(newAccountConfigs);
      expect(result.current).toHaveLength(1);
    });

    it('preserves account configuration order', () => {
      const orderedConfigs: AccountOptInBannerInfoStatus[] = [
        {
          accountGroupId: 'keyring:wallet1/1',
          hide: true,
        },
        {
          accountGroupId: 'keyring:wallet1/2',
          hide: false,
        },
        {
          accountGroupId: 'keyring:wallet1/3',
          hide: true,
        },
        {
          accountGroupId: 'keyring:wallet1/4',
          hide: false,
        },
      ];
      const mockState = {
        rewards: { hideCurrentAccountNotOptedInBanner: orderedConfigs },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideCurrentAccountNotOptedInBannerArray),
      );
      expect(result.current).toEqual(orderedConfigs);
      expect(result.current?.[0]?.accountGroupId).toBe('keyring:wallet1/1');
      expect(result.current?.[1]?.accountGroupId).toBe('keyring:wallet1/2');
      expect(result.current?.[2]?.accountGroupId).toBe('keyring:wallet1/3');
      expect(result.current?.[3]?.accountGroupId).toBe('keyring:wallet1/4');
    });

    it('handles different account group ID formats correctly', () => {
      const differentFormatConfigs: AccountOptInBannerInfoStatus[] = [
        {
          accountGroupId: 'keyring:wallet1/ethereum', // Ethereum wallet
          hide: true,
        },
        {
          accountGroupId: 'keyring:wallet2/polygon', // Polygon wallet
          hide: false,
        },
        {
          accountGroupId: 'keyring:wallet3/bsc', // BSC wallet
          hide: true,
        },
        {
          accountGroupId: 'keyring:wallet4/arbitrum', // Arbitrum wallet
          hide: false,
        },
      ];
      const mockState = {
        rewards: { hideCurrentAccountNotOptedInBanner: differentFormatConfigs },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectHideCurrentAccountNotOptedInBannerArray),
      );
      expect(result.current).toEqual(differentFormatConfigs);
      expect(result.current).toHaveLength(4);
      expect(
        result.current?.every((config) =>
          config.accountGroupId.startsWith('keyring:'),
        ),
      ).toBe(true);
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

    it('returns true when loading', () => {
      const mockState = { rewards: { activeBoostsLoading: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectActiveBoostsLoading),
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
        const tier = {
          id: 'bronze',
          name: 'Bronze',
          pointsNeeded: 100,
          image: {
            lightModeUrl: 'bronze.png',
            darkModeUrl: 'bronze-dark.png',
          },
          levelNumber: 'Level 1',
          rewards: [],
        };
        const state = createMockRootState({ seasonTiers: [tier] });
        expect(selectSeasonTiers(state)).toEqual([tier]);
      });

      it('preserves tier order', () => {
        const tiers = [
          {
            id: 'bronze',
            name: 'Bronze',
            pointsNeeded: 100,
            image: {
              lightModeUrl: 'bronze.png',
              darkModeUrl: 'bronze-dark.png',
            },
            levelNumber: 'Level 1',
            rewards: [],
          },
          {
            id: 'silver',
            name: 'Silver',
            pointsNeeded: 100,
            image: {
              lightModeUrl: 'silver.png',
              darkModeUrl: 'silver-dark.png',
            },
            levelNumber: 'Level 2',
            rewards: [],
          },
          {
            id: 'gold',
            name: 'Gold',
            pointsNeeded: 500,
            image: {
              lightModeUrl: 'gold.png',
              darkModeUrl: 'gold-dark.png',
            },
            levelNumber: 'Level 3',
            rewards: [],
          },
          {
            id: 'platinum',
            name: 'Platinum',
            pointsNeeded: 1000,
            image: {
              lightModeUrl: 'platinum.png',
              darkModeUrl: 'platinum-dark.png',
            },
            levelNumber: 'Level 4',
            rewards: [],
          },
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

    describe('selectHideCurrentAccountNotOptedInBannerArray direct calls', () => {
      it('returns empty array when no accounts configured', () => {
        const state = createMockRootState({
          hideCurrentAccountNotOptedInBanner: [],
        });
        expect(selectHideCurrentAccountNotOptedInBannerArray(state)).toEqual(
          [],
        );
      });

      it('returns account configurations when set', () => {
        const accountConfigs: AccountOptInBannerInfoStatus[] = [
          {
            accountGroupId: 'keyring:wallet1/1',
            hide: true,
          },
          {
            accountGroupId: 'keyring:wallet1/2',
            hide: false,
          },
        ];
        const state = createMockRootState({
          hideCurrentAccountNotOptedInBanner: accountConfigs,
        });
        expect(selectHideCurrentAccountNotOptedInBannerArray(state)).toEqual(
          accountConfigs,
        );
        expect(
          selectHideCurrentAccountNotOptedInBannerArray(state),
        ).toHaveLength(2);
      });

      it('preserves account configuration references', () => {
        const accountConfig: AccountOptInBannerInfoStatus = {
          accountGroupId: 'keyring:wallet1/3',
          hide: true,
        };
        const state = createMockRootState({
          hideCurrentAccountNotOptedInBanner: [accountConfig],
        });

        const result1 = selectHideCurrentAccountNotOptedInBannerArray(state);
        const result2 = selectHideCurrentAccountNotOptedInBannerArray(state);

        expect(result1).toBe(result2); // Same reference
        expect(result1).toEqual(result2); // Same value
        expect(result1[0]).toBe(accountConfig); // Original reference preserved
      });

      it('handles large arrays correctly', () => {
        const largeAccountConfigs: AccountOptInBannerInfoStatus[] = Array.from(
          { length: 50 },
          (_, i) => ({
            accountGroupId: `keyring:wallet${Math.floor(i / 10) + 1}/${
              (i % 10) + 1
            }`,
            hide: i % 2 === 0,
          }),
        );
        const state = createMockRootState({
          hideCurrentAccountNotOptedInBanner: largeAccountConfigs,
        });

        const result = selectHideCurrentAccountNotOptedInBannerArray(state);
        expect(result).toHaveLength(50);
        expect(result.filter((config) => config.hide)).toHaveLength(25);
        expect(result.filter((config) => !config.hide)).toHaveLength(25);
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
        const tier = {
          id: 'silver',
          name: 'Silver',
          pointsNeeded: 500,
          image: {
            lightModeUrl: 'silver.png',
            darkModeUrl: 'silver-dark.png',
          },
          levelNumber: 'Level 2',
          rewards: [],
        };
        const state = createMockRootState({ currentTier: tier });

        const result1 = selectCurrentTier(state);
        const result2 = selectCurrentTier(state);

        expect(result1).toBe(result2); // Same reference
        expect(result1).toEqual(result2); // Same value
      });

      it('returns different references for different inputs', () => {
        const tier1 = {
          id: 'silver',
          name: 'Silver',
          pointsNeeded: 500,
          image: {
            lightModeUrl: 'silver.png',
            darkModeUrl: 'silver-dark.png',
          },
          levelNumber: 'Level 2',
          rewards: [],
        };
        const tier2 = {
          id: 'gold',
          name: 'Gold',
          pointsNeeded: 1000,
          image: {
            lightModeUrl: 'gold.png',
            darkModeUrl: 'gold-dark.png',
          },
          levelNumber: 'Level 3',
          rewards: [],
        };
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
          {
            id: 'bronze',
            name: 'Bronze',
            pointsNeeded: 0,
            image: { lightModeUrl: 'lightModeUrl', darkModeUrl: 'darkModeUrl' },
            levelNumber: 'Level 1',
            rewards: [],
          },
          {
            id: 'silver',
            name: 'Silver',
            pointsNeeded: 500,
            image: { lightModeUrl: 'lightModeUrl', darkModeUrl: 'darkModeUrl' },
            levelNumber: 'Level 2',
            rewards: [],
          },
          {
            id: 'gold',
            name: 'Gold',
            pointsNeeded: 1500,
            image: { lightModeUrl: 'lightModeUrl', darkModeUrl: 'darkModeUrl' },
            levelNumber: 'Level 3',
            rewards: [],
          },
        ],
        referralDetailsLoading: false,
        referralCode: 'REFER2024',
        refereeCount: 25,
        currentTier: {
          id: 'silver',
          name: 'Silver',
          pointsNeeded: 500,
          image: { lightModeUrl: 'lightModeUrl', darkModeUrl: 'darkModeUrl' },
          levelNumber: 'Level 2',
          rewards: [],
        },
        nextTier: {
          id: 'gold',
          name: 'Gold',
          pointsNeeded: 1500,
          image: { lightModeUrl: 'lightModeUrl', darkModeUrl: 'darkModeUrl' },
          levelNumber: 'Level 3',
          rewards: [],
        },
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
        hideCurrentAccountNotOptedInBanner: [
          {
            accountGroupId: 'keyring:wallet1/1',
            hide: true,
          },
          {
            accountGroupId: 'keyring:wallet2/1',
            hide: false,
          },
        ],
        activeBoosts: [],
        activeBoostsLoading: false,
        activeBoostsError: false,
        unlockedRewards: [],
        unlockedRewardLoading: false,
        unlockedRewardError: false,
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
        expect(
          selectHideCurrentAccountNotOptedInBannerArray(comprehensiveState),
        ).toHaveLength(2);
        expect(
          selectHideCurrentAccountNotOptedInBannerArray(comprehensiveState)[0]
            .accountGroupId,
        ).toBe('keyring:wallet1/1');
        expect(
          selectHideCurrentAccountNotOptedInBannerArray(comprehensiveState)[0]
            .hide,
        ).toBe(true);
        expect(
          selectHideCurrentAccountNotOptedInBannerArray(comprehensiveState)[1]
            .accountGroupId,
        ).toBe('keyring:wallet2/1');
        expect(
          selectHideCurrentAccountNotOptedInBannerArray(comprehensiveState)[1]
            .hide,
        ).toBe(false);
        expect(selectActiveBoosts(comprehensiveState)).toEqual([]);
        expect(selectActiveBoostsLoading(comprehensiveState)).toBe(false);
        expect(selectActiveBoostsError(comprehensiveState)).toBe(false);
        expect(selectUnlockedRewards(comprehensiveState)).toEqual([]);
        expect(selectUnlockedRewardLoading(comprehensiveState)).toBe(false);
        expect(selectUnlockedRewardError(comprehensiveState)).toBe(false);
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

  describe('selectUnlockedRewards', () => {
    it('returns empty array when unlockedRewards is null', () => {
      const mockState = { rewards: { unlockedRewards: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectUnlockedRewards));
      expect(result.current).toBeNull();
    });

    it('returns empty array when unlockedRewards is empty', () => {
      const mockState = { rewards: { unlockedRewards: [] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectUnlockedRewards));
      expect(result.current).toEqual([]);
    });

    it('returns unlocked rewards array when available', () => {
      const mockUnlockedRewards = [
        {
          id: 'reward-1',
          seasonRewardId: 'season-reward-1',
          claimStatus: 'CLAIMED',
        },
        {
          id: 'reward-2',
          seasonRewardId: 'season-reward-2',
          claimStatus: 'UNCLAIMED',
        },
      ];
      const mockState = { rewards: { unlockedRewards: mockUnlockedRewards } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectUnlockedRewards));
      expect(result.current).toEqual(mockUnlockedRewards);
      expect(result.current).toHaveLength(2);
      expect(result.current?.[0]?.id).toBe('reward-1');
      expect(result.current?.[1]?.claimStatus).toBe('UNCLAIMED');
    });

    it('handles state changes correctly', () => {
      let mockState = { rewards: { unlockedRewards: [] as RewardDto[] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectUnlockedRewards),
      );
      expect(result.current).toEqual([]);

      // Change state to have rewards
      const newRewards = [
        {
          id: 'new-reward',
          seasonRewardId: 'season-1',
          claimStatus: 'CLAIMED',
        },
      ] as RewardDto[];
      mockState = { rewards: { unlockedRewards: newRewards } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toEqual(newRewards);
    });
  });

  describe('selectUnlockedRewardLoading', () => {
    it('returns false when unlockedRewardLoading is false', () => {
      const mockState = { rewards: { unlockedRewardLoading: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectUnlockedRewardLoading),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when unlockedRewardLoading is true', () => {
      const mockState = { rewards: { unlockedRewardLoading: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectUnlockedRewardLoading),
      );
      expect(result.current).toBe(true);
    });

    it('returns false when unlockedRewardLoading is undefined', () => {
      const mockState = { rewards: { unlockedRewardLoading: undefined } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectUnlockedRewardLoading),
      );
      expect(result.current).toBeUndefined();
    });

    it('handles loading state changes correctly', () => {
      let mockState = { rewards: { unlockedRewardLoading: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectUnlockedRewardLoading),
      );
      expect(result.current).toBe(false);

      // Change state to loading
      mockState = { rewards: { unlockedRewardLoading: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(true);
    });
  });

  describe('selectUnlockedRewardError', () => {
    it('returns false when unlockedRewardError is false', () => {
      const mockState = { rewards: { unlockedRewardError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectUnlockedRewardError),
      );
      expect(result.current).toBe(false);
    });

    it('returns true when unlockedRewardError is true', () => {
      const mockState = { rewards: { unlockedRewardError: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectUnlockedRewardError),
      );
      expect(result.current).toBe(true);
    });

    it('returns false when unlockedRewardError is undefined', () => {
      const mockState = { rewards: { unlockedRewardError: undefined } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectUnlockedRewardError),
      );
      expect(result.current).toBeUndefined();
    });

    it('handles error state changes correctly', () => {
      let mockState = { rewards: { unlockedRewardError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectUnlockedRewardError),
      );
      expect(result.current).toBe(false);

      // Change state to error
      mockState = { rewards: { unlockedRewardError: true } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(true);

      // Change back to no error
      mockState = { rewards: { unlockedRewardError: false } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBe(false);
    });
  });

  describe('selectSeasonRewardById', () => {
    const mockSeasonTiers = [
      {
        id: 'tier-1',
        name: 'Bronze',
        pointsNeeded: 0,
        image: {
          lightModeUrl: 'https://example.com/bronze-light.png',
          darkModeUrl: 'https://example.com/bronze-dark.png',
        },
        levelNumber: '1',
        rewards: [
          {
            id: 'reward-1',
            name: 'Bronze Badge',
            shortDescription: 'Bronze tier reward',
            iconName: 'Star',
            rewardType: 'BADGE',
          },
          {
            id: 'reward-2',
            name: 'Bronze Points',
            shortDescription: 'Bronze tier points',
            iconName: 'Trophy',
            rewardType: 'POINTS',
          },
        ],
      },
      {
        id: 'tier-2',
        name: 'Silver',
        pointsNeeded: 1000,
        image: {
          lightModeUrl: 'https://example.com/silver-light.png',
          darkModeUrl: 'https://example.com/silver-dark.png',
        },
        levelNumber: '2',
        rewards: [
          {
            id: 'reward-3',
            name: 'Silver Badge',
            shortDescription: 'Silver tier reward',
            iconName: 'Medal',
            rewardType: 'BADGE',
          },
        ],
      },
    ];

    it('returns undefined when seasonTiers is null', () => {
      const mockState = { rewards: { seasonTiers: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-1')),
      );
      expect(result.current).toBeUndefined();
    });

    it('returns undefined when seasonTiers is empty', () => {
      const mockState = { rewards: { seasonTiers: [] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-1')),
      );
      expect(result.current).toBeUndefined();
    });

    it('returns undefined when reward is not found', () => {
      const mockState = { rewards: { seasonTiers: mockSeasonTiers } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonRewardById('non-existent-reward')),
      );
      expect(result.current).toBeUndefined();
    });

    it('returns the correct reward when found in first tier', () => {
      const mockState = { rewards: { seasonTiers: mockSeasonTiers } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-1')),
      );
      expect(result.current).toBeDefined();
      expect(result.current?.id).toBe('reward-1');
      expect(result.current?.name).toBe('Bronze Badge');
      expect(result.current?.rewardType).toBe('BADGE');
    });

    it('returns the correct reward when found in second tier', () => {
      const mockState = { rewards: { seasonTiers: mockSeasonTiers } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-3')),
      );
      expect(result.current).toBeDefined();
      expect(result.current?.id).toBe('reward-3');
      expect(result.current?.name).toBe('Silver Badge');
      expect(result.current?.rewardType).toBe('BADGE');
    });

    it('returns the correct reward from multiple rewards in same tier', () => {
      const mockState = { rewards: { seasonTiers: mockSeasonTiers } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-2')),
      );
      expect(result.current).toBeDefined();
      expect(result.current?.id).toBe('reward-2');
      expect(result.current?.name).toBe('Bronze Points');
      expect(result.current?.rewardType).toBe('POINTS');
    });

    it('handles different reward IDs correctly', () => {
      const mockState = { rewards: { seasonTiers: mockSeasonTiers } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      // Test multiple different IDs
      const { result: result1 } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-1')),
      );
      const { result: result2 } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-2')),
      );
      const { result: result3 } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-3')),
      );

      expect(result1.current?.id).toBe('reward-1');
      expect(result2.current?.id).toBe('reward-2');
      expect(result3.current?.id).toBe('reward-3');
    });

    it('handles state changes correctly', () => {
      let mockState = { rewards: { seasonTiers: [] as SeasonTierDto[] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectSeasonRewardById('reward-1')),
      );
      expect(result.current).toBeUndefined();

      // Change state to have tiers with rewards
      mockState = {
        rewards: { seasonTiers: mockSeasonTiers as SeasonTierDto[] },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toBeDefined();
      expect(result.current?.id).toBe('reward-1');
    });
  });

  describe('selectPointsEvents', () => {
    it('returns null when points events is null', () => {
      const mockState = { rewards: { pointsEvents: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectPointsEvents));
      expect(result.current).toBeNull();
    });

    it('returns empty array when points events is empty', () => {
      const mockState = { rewards: { pointsEvents: [] } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectPointsEvents));
      expect(result.current).toEqual([]);
      expect(result.current).toHaveLength(0);
    });

    it('returns points events array when available', () => {
      const mockPointsEvents: PointsEventDto[] = [
        {
          id: 'event-1',
          type: 'SWAP',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          value: 100,
          bonus: null,
          accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          payload: {
            srcAsset: {
              amount: '1000000000000000000',
              symbol: 'ETH',
              name: 'Ethereum',
              decimals: 18,
              type: 'eip155:1/slip44:0',
            },
            destAsset: {
              amount: '1000000000000000000',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              type: 'eip155:1/erc20:0xA0b86a33E6441b8c4C8C0C0C0C0C0C0C0C0C0C0C',
            },
            txHash:
              '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          },
        },
        {
          id: 'event-2',
          type: 'REFERRAL',
          timestamp: new Date('2024-01-02T00:00:00Z'),
          value: 50,
          bonus: null,
          accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
          updatedAt: new Date('2024-01-02T00:00:00Z'),
          payload: null,
        },
      ];
      const mockState = { rewards: { pointsEvents: mockPointsEvents } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() => useSelector(selectPointsEvents));
      expect(result.current).toEqual(mockPointsEvents);
      expect(result.current).toHaveLength(2);
      expect(result.current?.[0]?.id).toBe('event-1');
      expect(result.current?.[0]?.type).toBe('SWAP');
      expect(result.current?.[1]?.type).toBe('REFERRAL');
    });

    it('handles state changes correctly', () => {
      let mockState = {
        rewards: { pointsEvents: null as PointsEventDto[] | null },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result, rerender } = renderHook(() =>
        useSelector(selectPointsEvents),
      );
      expect(result.current).toBeNull();

      // Change state to have points events
      const newEvents: PointsEventDto[] = [
        {
          id: 'new-event',
          type: 'SWAP',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          value: 150,
          bonus: null,
          accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          payload: {
            srcAsset: {
              amount: '1000000000000000000',
              symbol: 'BTC',
              name: 'Bitcoin',
              decimals: 8,
              type: 'eip155:1/slip44:0',
            },
            destAsset: {
              amount: '1000000000000000000',
              name: 'Ethereum',
              decimals: 18,
              symbol: 'ETH',
              type: 'eip155:1/slip44:60',
            },
          },
        },
      ];
      mockState = { rewards: { pointsEvents: newEvents } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));
      rerender();
      expect(result.current).toEqual(newEvents);
      expect(result.current).toHaveLength(1);
      expect(result.current?.[0]?.id).toBe('new-event');
    });

    it('returns same reference for same input', () => {
      const events: PointsEventDto[] = [
        {
          id: 'event-1',
          type: 'SWAP',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          value: 100,
          bonus: null,
          accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          payload: {
            srcAsset: {
              amount: '1000000000000000000',
              type: 'eip155:1/slip44:60',
              decimals: 18,
              name: 'Ethereum',
              symbol: 'ETH',
            },
            destAsset: {
              amount: '1000000000000000000',
              type: 'eip155:1/erc20:0xA0b86a33E6441b8c4C8C0C0C0C0C0C0C0C0C0C0C',
              decimals: 6,
              name: 'USD Coin',
              symbol: 'USDC',
            },
          },
        },
      ];
      const state = createMockRootState({ pointsEvents: events });

      const result1 = selectPointsEvents(state);
      const result2 = selectPointsEvents(state);

      expect(result1).toBe(result2); // Same reference
      expect(result1).toEqual(result2); // Same value
    });
  });

  describe('selectSeasonShouldInstallNewVersion', () => {
    it('returns null when season should install new version is not set', () => {
      const mockState = { rewards: { seasonShouldInstallNewVersion: null } };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonShouldInstallNewVersion),
      );
      expect(result.current).toBeNull();
    });

    it('returns version string when set', () => {
      const mockState = {
        rewards: { seasonShouldInstallNewVersion: '1.2.3' },
      };
      mockedUseSelector.mockImplementation((selector) => selector(mockState));

      const { result } = renderHook(() =>
        useSelector(selectSeasonShouldInstallNewVersion),
      );
      expect(result.current).toBe('1.2.3');
    });

    describe('Direct selector calls', () => {
      it('returns null when season should install new version is null', () => {
        const state = createMockRootState({
          seasonShouldInstallNewVersion: null,
        });
        expect(selectSeasonShouldInstallNewVersion(state)).toBeNull();
      });

      it('returns version string when set', () => {
        const state = createMockRootState({
          seasonShouldInstallNewVersion: '2.0.0',
        });
        expect(selectSeasonShouldInstallNewVersion(state)).toBe('2.0.0');
      });
    });
  });
});
