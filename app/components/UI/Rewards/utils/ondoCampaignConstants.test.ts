import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import {
  CampaignType,
  type CampaignDto,
  type CampaignLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { isOndoCampaignWinner } from './ondoCampaignConstants';

jest.mock('../components/Campaigns/CampaignTile.utils', () => ({
  getCampaignStatus: jest.fn(),
}));

const mockGetCampaignStatus = getCampaignStatus as jest.MockedFunction<
  typeof getCampaignStatus
>;

const createCampaign = (): CampaignDto => ({
  id: 'c1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test',
  startDate: '2020-01-01T00:00:00.000Z',
  endDate: '2020-06-01T00:00:00.000Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: false,
});

const createPosition = (
  overrides: Partial<CampaignLeaderboardPositionDto> = {},
): CampaignLeaderboardPositionDto => ({
  projectedTier: 'MID',
  rank: 3,
  totalInTier: 10,
  rateOfReturn: 0.1,
  currentUsdValue: 1000,
  totalUsdDeposited: 1000,
  netDeposit: 1000,
  qualifiedDays: 10,
  qualified: true,
  neighbors: [],
  computedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('isOndoCampaignWinner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when campaign is null', () => {
    const position = createPosition();

    const result = isOndoCampaignWinner(null, position);

    expect(result).toBe(false);

    expect(mockGetCampaignStatus).not.toHaveBeenCalled();
  });

  it('returns false when campaign status is active', () => {
    const campaign = createCampaign();

    mockGetCampaignStatus.mockReturnValue('active');
    const position = createPosition({ rank: 2, qualified: true });

    const result = isOndoCampaignWinner(campaign, position);

    expect(result).toBe(false);

    expect(mockGetCampaignStatus).toHaveBeenCalledWith(campaign);
  });

  it('returns false when campaign status is upcoming', () => {
    const campaign = createCampaign();

    mockGetCampaignStatus.mockReturnValue('upcoming');
    const position = createPosition({ rank: 2, qualified: true });

    const result = isOndoCampaignWinner(campaign, position);

    expect(result).toBe(false);
  });

  it('returns true when campaign is complete, rank is at most 5, and qualified', () => {
    const campaign = createCampaign();

    mockGetCampaignStatus.mockReturnValue('complete');
    const position = createPosition({ rank: 5, qualified: true });

    const result = isOndoCampaignWinner(campaign, position);

    expect(result).toBe(true);
  });

  it('returns false when campaign is complete but rank is above 5', () => {
    const campaign = createCampaign();

    mockGetCampaignStatus.mockReturnValue('complete');
    const position = createPosition({ rank: 6, qualified: true });

    const result = isOndoCampaignWinner(campaign, position);

    expect(result).toBe(false);
  });

  it('returns false when campaign is complete but not qualified', () => {
    const campaign = createCampaign();

    mockGetCampaignStatus.mockReturnValue('complete');
    const position = createPosition({ rank: 3, qualified: false });

    const result = isOndoCampaignWinner(campaign, position);

    expect(result).toBe(false);
  });

  it('returns false when position is null', () => {
    const campaign = createCampaign();

    mockGetCampaignStatus.mockReturnValue('complete');

    const result = isOndoCampaignWinner(campaign, null);

    expect(result).toBe(false);
  });
});
