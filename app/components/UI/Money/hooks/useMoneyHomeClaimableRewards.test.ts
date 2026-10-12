import { act } from '@testing-library/react-native';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
  ReferralMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useEarningsSummary } from '../../Rewards/hooks/useEarningsSummary';
import { useReferralMe } from '../../Rewards/hooks/useReferralMe';
import {
  navigateToRewardsEarningsTab,
  useMoneyHomeClaimableRewards,
} from './useMoneyHomeClaimableRewards';

jest.mock('../../Rewards/hooks/useReferralMe', () => ({
  useReferralMe: jest.fn(),
}));

jest.mock('../../Rewards/hooks/useEarningsSummary', () => ({
  useEarningsSummary: jest.fn(),
}));

const PROFILE_ID = 'profile-a';
const ONE_DOLLAR = '1000000';
const UNDER_DOLLAR = '990000';

const mockUseReferralMe = useReferralMe as jest.MockedFunction<
  typeof useReferralMe
>;
const mockUseEarningsSummary = useEarningsSummary as jest.MockedFunction<
  typeof useEarningsSummary
>;
const mockFetchReferralMe = jest.fn().mockResolvedValue({
  status: 'settled',
  profileId: PROFILE_ID,
});
const mockFetchEarningsSummary = jest.fn().mockResolvedValue(undefined);

const LOCALIZED_TEXT = {
  availableToClaim: 'Available to claim',
  mUSD: 'mUSD',
  claim: 'Claim',
} as ReferralLocalizedText;

const summaryWithCashback = (claimable: string): EarningsSummaryDto =>
  ({
    lifetime_total: '0',
    window: null,
    pending: '0',
    claimed: '0',
    minimum_musd_base_units: ONE_DOLLAR,
    pairing_pending: false,
    self_earned: {
      lifetime: '0',
      pending: '0',
      claimed: '0',
      by_claim_family: {
        REFERRAL_TRADE_FEE_CASHBACK: {
          lifetime: '0',
          claimable,
          pending: '0',
          claimed: '0',
          by_address: [],
        },
      },
    },
    earned_by_others: {
      lifetime: '0',
      pending: '0',
      claimed: '0',
      by_claim_family: {},
    },
  }) as EarningsSummaryDto;

const renderClaimCard = ({
  role = 'REFEREE',
  claimable,
  profileId = PROFILE_ID,
  localizedText = LOCALIZED_TEXT,
}: {
  role?: 'REFEREE' | 'REFERRER';
  claimable?: string;
  profileId?: string;
  localizedText?: ReferralLocalizedText | undefined;
} = {}) => {
  mockUseReferralMe.mockReturnValue({
    profileId,
    fetchReferralMe: mockFetchReferralMe,
  });
  mockUseEarningsSummary.mockReturnValue({
    fetchEarningsSummary: mockFetchEarningsSummary,
  });

  return renderHookWithProvider(() => useMoneyHomeClaimableRewards(), {
    state: {
      rewardsMoney: {
        referralMe: {
          [profileId]: {
            loading: false,
            error: false,
            data: {
              roles: [role],
              ui_variant: role,
              localized_text: localizedText,
            } as ReferralMeDto,
          },
        },
        earningsSummary: claimable
          ? {
              [profileId]: {
                loading: false,
                error: false,
                data: summaryWithCashback(claimable),
              },
            }
          : {},
      },
    },
  });
};

describe('useMoneyHomeClaimableRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a referee rebate of at least $1', () => {
    const { result } = renderClaimCard({ claimable: ONE_DOLLAR });

    expect(result.current.show).toBe(true);
    expect(result.current.amount).toBe('$1.00');
    expect(result.current.localizedText).toBe(LOCALIZED_TEXT);
  });

  it('hides a referrer even when cashback is at least $1', () => {
    const { result } = renderClaimCard({
      role: 'REFERRER',
      claimable: ONE_DOLLAR,
    });

    expect(result.current.show).toBe(false);
  });

  it('hides a referee rebate under $1', () => {
    const { result } = renderClaimCard({ claimable: UNDER_DOLLAR });

    expect(result.current.show).toBe(false);
  });

  it('hides the card when the earnings summary is missing', () => {
    const { result } = renderClaimCard();

    expect(result.current.show).toBe(false);
  });

  it('refreshes referral me and the earnings summary', async () => {
    const { result } = renderClaimCard({ claimable: ONE_DOLLAR });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
    expect(mockFetchEarningsSummary).toHaveBeenCalledWith({
      forceFresh: true,
    });
  });
});

describe('navigateToRewardsEarningsTab', () => {
  it('opens the Rewards Money dashboard on the earnings tab', () => {
    const navigate = jest.fn();

    navigateToRewardsEarningsTab({
      navigate,
    } as Pick<AppNavigationProp, 'navigate'>);

    expect(navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW, {
      screen: Routes.REWARDS_MONEY_DASHBOARD,
      params: { initialTab: 'earnings' },
      initial: false,
    });
  });
});
