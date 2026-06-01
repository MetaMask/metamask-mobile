import { renderHook } from '@testing-library/react-hooks';
import { useOndoLeaderboardPositionDisplay } from './useOndoLeaderboardPositionDisplay';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import { isCampaignIneligible } from '../utils/ondoCampaignConstants';
import type {
  CampaignDto,
  CampaignLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../components/Campaigns/CampaignTile.utils', () => ({
  getCampaignStatus: jest.fn(),
}));

jest.mock('../utils/ondoCampaignConstants', () => ({
  isCampaignIneligible: jest.fn(),
}));

jest.mock('../components/Campaigns/OndoLeaderboard.utils', () => ({
  formatTierDisplayName: (tier: string) => `${tier}_DISPLAY`,
}));

jest.mock('../utils/formatUtils', () => ({
  formatPercentChange: (value: string) => `+${value}%`,
  getPortfolioReturnColor: (pnl?: string) =>
    pnl && parseFloat(pnl) < 0 ? 'text-error-default' : 'text-default',
}));

const mockGetCampaignStatus = getCampaignStatus as jest.MockedFunction<
  typeof getCampaignStatus
>;
const mockIsCampaignIneligible = isCampaignIneligible as jest.MockedFunction<
  typeof isCampaignIneligible
>;

const buildCampaign = (overrides: Partial<CampaignDto> = {}): CampaignDto => ({
  id: 'campaign-1',
  type: 'ONDO_HOLDING' as never,
  name: 'Test Campaign',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2099-12-31T23:59:59Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: {
    howItWorks: { title: '', description: '', steps: [] },
    tiers: [{ name: 'STARTER', minNetDeposit: 500 }],
  },
  featured: false,
  showUpcomingDate: false,
  ...overrides,
});

const buildPosition = (
  overrides: Partial<CampaignLeaderboardPositionDto> = {},
): CampaignLeaderboardPositionDto => ({
  rank: 5,
  projectedTier: 'STARTER',
  qualified: true,
  qualifiedDays: 10,
  totalInTier: 100,
  rateOfReturn: 0.1,
  currentUsdValue: 12500,
  totalUsdDeposited: 10000,
  netDeposit: 8500,
  neighbors: [],
  computedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('useOndoLeaderboardPositionDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCampaignStatus.mockReturnValue('active');
    mockIsCampaignIneligible.mockReturnValue(false);
  });

  describe('isCampaignComplete', () => {
    it('returns true when getCampaignStatus returns complete', () => {
      mockGetCampaignStatus.mockReturnValue('complete');
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: buildCampaign(),
          position: null,
        }),
      );
      expect(result.current.isCampaignComplete).toBe(true);
    });

    it('returns false when getCampaignStatus returns active', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: buildCampaign(),
          position: null,
        }),
      );
      expect(result.current.isCampaignComplete).toBe(false);
    });

    it('returns false when campaign is null', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({ campaign: null, position: null }),
      );
      expect(result.current.isCampaignComplete).toBe(false);
    });
  });

  describe('isPending and isQualified', () => {
    it('isPending is true when position.qualified is false', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: null,
          position: buildPosition({ qualified: false }),
        }),
      );
      expect(result.current.isPending).toBe(true);
      expect(result.current.isQualified).toBe(false);
    });

    it('isQualified is true when position.qualified is true', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: null,
          position: buildPosition({ qualified: true }),
        }),
      );
      expect(result.current.isPending).toBe(false);
      expect(result.current.isQualified).toBe(true);
    });

    it('both are false when position is null', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({ campaign: null, position: null }),
      );
      expect(result.current.isPending).toBe(false);
      expect(result.current.isQualified).toBe(false);
    });
  });

  describe('isIneligible', () => {
    it('delegates to isCampaignIneligible', () => {
      mockIsCampaignIneligible.mockReturnValue(true);
      const campaign = buildCampaign();
      const position = buildPosition({ qualified: false });
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({ campaign, position }),
      );
      expect(result.current.isIneligible).toBe(true);
      expect(mockIsCampaignIneligible).toHaveBeenCalledWith(
        campaign,
        position.qualified,
      );
    });

    it('returns false when isCampaignIneligible returns false', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: buildCampaign(),
          position: buildPosition(),
        }),
      );
      expect(result.current.isIneligible).toBe(false);
    });
  });

  describe('rankValue', () => {
    it('returns dash when position is null', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({ campaign: null, position: null }),
      );
      expect(result.current.rankValue).toBe('-');
    });

    it('returns dash when isIneligible is true', () => {
      mockIsCampaignIneligible.mockReturnValue(true);
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: buildCampaign(),
          position: buildPosition({ rank: 3 }),
        }),
      );
      expect(result.current.rankValue).toBe('-');
    });

    it('returns zero-padded rank when eligible with position', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: buildCampaign(),
          position: buildPosition({ rank: 7 }),
        }),
      );
      expect(result.current.rankValue).toBe('07');
    });

    it('does not pad two-digit ranks', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: buildCampaign(),
          position: buildPosition({ rank: 42 }),
        }),
      );
      expect(result.current.rankValue).toBe('42');
    });
  });

  describe('tierValue', () => {
    it('returns dash when position is null', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({ campaign: null, position: null }),
      );
      expect(result.current.tierValue).toBe('-');
    });

    it('returns dash when isIneligible is true', () => {
      mockIsCampaignIneligible.mockReturnValue(true);
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: buildCampaign(),
          position: buildPosition({ projectedTier: 'MID' }),
        }),
      );
      expect(result.current.tierValue).toBe('-');
    });

    it('returns formatted tier display name when eligible with position', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: buildCampaign(),
          position: buildPosition({ projectedTier: 'MID' }),
        }),
      );
      expect(result.current.tierValue).toBe('MID_DISPLAY');
    });
  });

  describe('returnValue', () => {
    it('returns undefined when portfolioPnlPercent is undefined', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({ campaign: null, position: null }),
      );
      expect(result.current.returnValue).toBeUndefined();
    });

    it('returns formatted value when portfolioPnlPercent is provided', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: null,
          position: null,
          portfolioPnlPercent: '0.05',
        }),
      );
      expect(result.current.returnValue).toBe('+0.05%');
    });
  });

  describe('returnColor', () => {
    it('returns TextDefault when portfolioPnlPercent is undefined', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({ campaign: null, position: null }),
      );
      expect(result.current.returnColor).toBe('text-default');
    });

    it('returns ErrorDefault when portfolioPnlPercent is negative', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: null,
          position: null,
          portfolioPnlPercent: '-0.05',
        }),
      );
      expect(result.current.returnColor).toBe('text-error-default');
    });

    it('returns TextDefault when portfolioPnlPercent is positive', () => {
      const { result } = renderHook(() =>
        useOndoLeaderboardPositionDisplay({
          campaign: null,
          position: null,
          portfolioPnlPercent: '0.10',
        }),
      );
      expect(result.current.returnColor).toBe('text-default');
    });
  });
});
