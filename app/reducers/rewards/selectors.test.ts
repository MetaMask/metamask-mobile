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
  selectSeasonName,
  selectSeasonStartDate,
  selectSeasonEndDate,
  selectSeasonTiers,
  selectOnboardingActiveStep,
  selectGeoLocation,
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
  selectReferralDetailsLoading,
} from './selectors';
import { OnboardingStep } from './types';
import { SeasonTierDto } from '../../core/Engine/controllers/rewards-controller/types';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockedUseSelector = useSelector as jest.MockedFunction<
  typeof useSelector
>;

describe('Rewards selectors', () => {
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
});
