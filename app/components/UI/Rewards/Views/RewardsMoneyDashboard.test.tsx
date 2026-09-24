import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { REFERER_HERO_CARD_TEST_IDS } from '../components/Money/RefererHeroCard';
import { REFEREE_HERO_CARD_TEST_IDS } from '../components/Money/RefereeHeroCard';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from '../components/Money/RewardsOptInSection';
import { useReferralMe, useSessionProfileId } from '../hooks/useReferralMe';
import { useEarningsSummary } from '../hooks/useEarningsSummary';
import RewardsMoneyDashboard, {
  REWARDS_MONEY_DASHBOARD_TEST_IDS,
} from './RewardsMoneyDashboard';

const PROFILE_ID = 'profile-a';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockParentNavigatorType = 'tab';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      getParent: () => ({
        getState: () => ({ type: mockParentNavigatorType }),
      }),
    }),
  };
});

jest.mock('../hooks/useReferralMe', () => ({
  useSessionProfileId: jest.fn(),
  useReferralMe: jest.fn(),
}));

jest.mock('../hooks/useEarningsSummary', () => ({
  useEarningsSummary: jest.fn(),
}));

jest.mock('../components/Money/RewardsOptInSection', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    REWARDS_OPT_IN_SECTION_TEST_IDS: {
      CONTAINER: 'rewards-opt-in-section',
    },
    default: () => <View testID="rewards-opt-in-section" />,
  };
});

jest.mock(
  '../../../../component-library/components/Navigation/TabBarFloating',
  () => ({
    useFloatingTabBarInset: () => 0,
  }),
);

jest.mock('../../../Views/ErrorBoundary', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('../components/Campaigns/CampaignsPreview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="campaigns-preview" />,
  };
});

jest.mock('../components/Money/PerformanceTab', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    PERFORMANCE_TAB_TEST_IDS: {
      CONTAINER: 'rewards-money-performance-tab',
    },
    default: () => <View testID="rewards-money-performance-tab" />,
  };
});

jest.mock('../components/Benefits/BenefitsPreview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="benefits-preview" />,
  };
});

const mockUseSessionProfileId = useSessionProfileId as jest.MockedFunction<
  typeof useSessionProfileId
>;
const mockUseReferralMe = useReferralMe as jest.MockedFunction<
  typeof useReferralMe
>;
const mockUseEarningsSummary = useEarningsSummary as jest.MockedFunction<
  typeof useEarningsSummary
>;
const mockFetchReferralMe = jest.fn();

const LOCALIZED_TEXT = {
  waysToEarn: 'Ways to earn',
  earningsTab: 'Earnings',
  performanceTitle: 'Performance',
  earnEligibleFees: 'Earn on eligible fees',
  yourReferralCode: 'Your referral code',
  share: 'Share',
  historyReferrals: 'Referrals',
  tradeCommissions: 'Trade commissions',
  tradingCommissionsSection: 'Trading commissions',
  tradingRebates: 'Trading rebates',
  recordedEarnings: 'recorded claims',
  invitedBenefitTitle: 'Your referral benefit',
  invitedReferredBy: 'Referred by',
  invitedOptInDescription: 'Opt in to Rewards to start earning.',
  invitedOptInAction: 'Opt in to Rewards',
  invitedOptInLegal: 'Rewards terms apply.',
} as unknown as ReferralMeDto['localized_text'];

const EARN_RATES = {
  revshare_rate_bps: 2500,
  cashback_rate_bps: 500,
  revshare_earning_term_minutes: null,
  cashback_earning_term_minutes: null,
};

const createReferralMe = (
  overrides: Partial<ReferralMeDto> = {},
): ReferralMeDto => ({
  role: 'REFERRER',
  variant: 'REFERRER',
  user_type: 'REGULAR',
  status: 'ACTIVE',
  referral_code: {
    code: 'SOPHIE',
    kind: 'PRIMARY',
    status: 'ACTIVE',
    share_url: null,
  },
  referred_by: null,
  earn_rates: EARN_RATES,
  localized_text: LOCALIZED_TEXT,
  invite_hero: null,
  ...overrides,
});

const emptyBranch = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  by_claim_family: {},
};

const EARNINGS_SUMMARY = {
  lifetime_total: '0',
  window: null,
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '1000000',
  self_earned: {
    ...emptyBranch,
    by_claim_family: {
      REFERRAL_TRADE_FEE_CASHBACK: { ...emptyBranch, lifetime: '7650000' },
    },
  },
  earned_by_others: {
    ...emptyBranch,
    by_claim_family: {
      REFERRAL_REV_SHARE: { ...emptyBranch, lifetime: '41750000' },
      SOCIAL_FOLLOW_TRADE: { ...emptyBranch, lifetime: '9150000' },
    },
  },
} as unknown as EarningsSummaryDto;

const renderDashboard = ({
  profileId = PROFILE_ID,
  hasProfileId = true,
  isResolved = true,
  subscriptionId = 'sub-123',
  referralMeEntry,
  earningsSummaryEntry,
}: {
  profileId?: string;
  hasProfileId?: boolean;
  isResolved?: boolean;
  subscriptionId?: string | null;
  referralMeEntry?: {
    loading: boolean;
    error: boolean;
    data: ReferralMeDto | null;
  };
  earningsSummaryEntry?: {
    loading: boolean;
    error: boolean;
    data: EarningsSummaryDto | null;
  };
} = {}) => {
  const sessionProfileId = hasProfileId ? profileId : undefined;

  mockUseSessionProfileId.mockReturnValue({
    profileId: sessionProfileId,
    isResolved,
  });

  return renderWithProvider(<RewardsMoneyDashboard />, {
    state: {
      rewards: {
        candidateSubscriptionId: subscriptionId,
      },
      engine: {
        backgroundState: {
          RewardsController: {
            activeAccount: subscriptionId
              ? { subscriptionId }
              : { subscriptionId: null },
          },
        },
      },
      rewardsMoney: {
        referralMe: sessionProfileId
          ? {
              [sessionProfileId]: referralMeEntry ?? {
                loading: false,
                error: false,
                data: createReferralMe(),
              },
            }
          : {},
        earningsSummary: sessionProfileId
          ? {
              [sessionProfileId]: earningsSummaryEntry ?? {
                loading: false,
                error: false,
                data: EARNINGS_SUMMARY,
              },
            }
          : {},
      },
    },
  });
};

describe('RewardsMoneyDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParentNavigatorType = 'tab';
    mockUseEarningsSummary.mockReturnValue({
      fetchEarningsSummary: jest.fn(),
    });
    mockUseReferralMe.mockReturnValue({
      profileId: PROFILE_ID,
      fetchReferralMe: mockFetchReferralMe,
    });
  });

  it('renders the layout skeleton while the session profile is unresolved', () => {
    const { getByTestId, queryByTestId } = renderDashboard({
      isResolved: false,
      referralMeEntry: {
        loading: false,
        error: false,
        data: createReferralMe(),
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.LOADING),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.TABS),
    ).not.toBeOnTheScreen();
  });

  it('renders the layout skeleton while referral me is loading without data', () => {
    const { getByTestId } = renderDashboard({
      referralMeEntry: {
        loading: true,
        error: false,
        data: null,
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.LOADING),
    ).toBeOnTheScreen();
  });

  it('renders the transient skeleton when mounted without a referral persona', () => {
    const { getByTestId, queryByTestId } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: true,
        data: null,
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.LOADING),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the transient skeleton when the session has no profile id', () => {
    const { getByTestId } = renderDashboard({
      hasProfileId: false,
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.LOADING),
    ).toBeOnTheScreen();
  });

  it('renders the referrer hero and opted-in previews for a subscribed referrer', () => {
    const { getByTestId, queryByTestId } = renderDashboard();

    expect(getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId('campaigns-preview')).toBeOnTheScreen();
    expect(getByTestId('benefits-preview')).toBeOnTheScreen();
    expect(
      queryByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders campaigns and benefits sections with dividers on the dashboard', () => {
    const { getByTestId } = renderDashboard();

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_SECTION),
    ).toBeOnTheScreen();
    expect(getByTestId('campaigns-preview')).toBeOnTheScreen();
    expect(getByTestId('benefits-preview')).toBeOnTheScreen();
  });

  it('renders the referee hero and hides the referrer share card', () => {
    const { getByTestId, queryByTestId } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: false,
        data: createReferralMe({
          role: 'REFEREE',
          variant: 'REFEREE',
          referral_code: null,
          referred_by: {
            referral_code: 'SOPHIE',
            earning_start: null,
            earning_end: null,
          },
        }),
      },
    });

    expect(getByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('fetches the earnings summary for the resolved profile', () => {
    renderDashboard();

    expect(mockUseEarningsSummary).toHaveBeenCalledWith(PROFILE_ID);
  });

  it('feeds the referrer hero the earned-by-others totals', () => {
    const { getByText } = renderDashboard();

    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(getByText('$9.15')).toBeOnTheScreen();
  });

  it('feeds the referee hero its own cashback as rebates', () => {
    const { getByText } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: false,
        data: createReferralMe({
          role: 'REFEREE',
          variant: 'REFEREE',
          referral_code: null,
          referred_by: {
            referral_code: 'SOPHIE',
            earning_start: null,
            earning_end: null,
          },
        }),
      },
    });

    expect(getByText('$7.65')).toBeOnTheScreen();
  });

  it('keeps the hero readable and shows retry when the summary failed', () => {
    const { getAllByText, getByTestId, queryByText } = renderDashboard({
      earningsSummaryEntry: { loading: false, error: true, data: null },
    });

    expect(getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getAllByText('-')).toHaveLength(2);
    expect(queryByText('$41.75')).not.toBeOnTheScreen();
    expect(queryByText('$0.00')).not.toBeOnTheScreen();
    expect(
      getByTestId(REFERER_HERO_CARD_TEST_IDS.EARNINGS_ERROR),
    ).toBeOnTheScreen();
  });

  it('renders the Rewards opt-in section when there is no subscription', () => {
    const { getByTestId, queryByTestId } = renderDashboard({
      subscriptionId: null,
    });

    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId('campaigns-preview')).not.toBeOnTheScreen();
    expect(queryByTestId('benefits-preview')).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_SECTION),
    ).not.toBeOnTheScreen();
  });

  it('hides settings when there is no subscription', () => {
    const { queryByTestId } = renderDashboard({ subscriptionId: null });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('opens Rewards settings from the header when subscribed', () => {
    const { getByTestId } = renderDashboard();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
      screen: Routes.REWARDS_SETTINGS_VIEW,
      params: undefined,
    });
  });

  it('shows an inline error banner on Ways to earn when referral me is stale with an error', () => {
    const { getByTestId, getByText } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: true,
        data: createReferralMe(),
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REFERER_HERO_CARD_TEST_IDS.REFERRAL_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('rewards.referral_details_error.retry_button')),
    ).toBeOnTheScreen();
    expect(getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
  });

  it('retries referral me with a fresh fetch from the stale-data error banner', () => {
    const { getByText } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: true,
        data: createReferralMe(),
      },
    });

    fireEvent.press(
      getByText(strings('rewards.referral_details_error.retry_button')),
    );

    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
  });

  it('renders no earnings indicator when nothing is claimable', () => {
    const { queryByTestId } = renderDashboard();

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toBeNull();
  });

  it('renders the earnings indicator when there is a claimable balance', () => {
    const { getByTestId } = renderDashboard({
      earningsSummaryEntry: {
        loading: false,
        error: false,
        data: { ...EARNINGS_SUMMARY, claimable: '50' },
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toBeOnTheScreen();
  });

  it('switches to an empty Earnings tab body', () => {
    const { getByTestId, queryByTestId } = renderDashboard();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB));

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY),
    ).not.toBeOnTheScreen();
  });

  it('switches to the Performance tab body', () => {
    const { getByTestId, queryByTestId } = renderDashboard();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PERFORMANCE_TAB),
    );

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PERFORMANCE_BODY),
    ).toBeOnTheScreen();
    expect(getByTestId('rewards-money-performance-tab')).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY),
    ).not.toBeOnTheScreen();
  });
});
