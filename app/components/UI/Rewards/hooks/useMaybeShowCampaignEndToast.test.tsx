import { isOndoCampaignWinner } from './useMaybeShowCampaignEndToast';
import type { CampaignLeaderboardPositionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Break transitive import chains that pull in Engine → @metamask/assets-controller
jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(() => ({ showToast: jest.fn(), RewardsToastOptions: {} })),
}));

jest.mock('./useGetOndoLeaderboardPosition', () => ({
  useGetOndoLeaderboardPosition: jest.fn(() => ({
    position: null,
    isLoading: false,
    hasError: false,
    hasFetched: false,
    refetch: jest.fn(),
  })),
}));

const basePosition = {
  projectedTier: 'MID',
  totalInTier: 10,
  rateOfReturn: 0,
  currentUsdValue: 0,
  totalUsdDeposited: 0,
  netDeposit: 0,
  qualifiedDays: 5,
  neighbors: [],
  computedAt: '',
} as unknown as CampaignLeaderboardPositionDto;

describe('isOndoCampaignWinner', () => {
  it('returns false when position is null', () => {
    expect(isOndoCampaignWinner(null)).toBe(false);
  });

  it('returns true when rank is at most 5 and qualified', () => {
    expect(
      isOndoCampaignWinner({
        ...basePosition,
        rank: 3,
        qualified: true,
      }),
    ).toBe(true);
  });

  it('returns false when rank is greater than 5', () => {
    expect(
      isOndoCampaignWinner({
        ...basePosition,
        rank: 6,
        qualified: true,
      }),
    ).toBe(false);
  });

  it('returns false when not qualified', () => {
    expect(
      isOndoCampaignWinner({
        ...basePosition,
        rank: 1,
        qualified: false,
      }),
    ).toBe(false);
  });
});
