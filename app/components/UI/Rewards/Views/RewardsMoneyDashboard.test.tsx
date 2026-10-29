import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';
import type {
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import { strings } from '../../../../../locales/i18n';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { REFERER_HERO_CARD_TEST_IDS } from '../components/Money/RefererHeroCard';
import { REFEREE_HERO_CARD_TEST_IDS } from '../components/Money/RefereeHeroCard';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from '../components/Money/RewardsOptInSection';
import { WAYS_TO_EARN_TAB_TEST_IDS } from '../components/Money/Tabs/WaysToEarnTab.testIds';
import { useEarningsSummary } from '../hooks/useEarningsSummary';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { analytics } from '../../../../util/analytics/analytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import RewardsMoneyDashboard from './RewardsMoneyDashboard';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from './RewardsMoneyDashboard.testIds';

const PROFILE_ID = 'profile-a';
const KEYRING_ID = 'entropy-source-1';

const mockFetchReferralMe = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock('../hooks/useReferralMe', () => ({
  useReferralMe: () => ({
    profileId: undefined,
    fetchReferralMe: mockFetchReferralMe,
  }),
}));

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

const mockPerformanceTab = jest.fn();

jest.mock('../components/Money/Tabs/EarningsTab', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    EARNINGS_TAB_TEST_IDS: {
      CONTAINER: 'rewards-money-earnings-tab',
    },
    default: () => <View testID="rewards-money-earnings-tab" />,
  };
});

jest.mock('../components/Money/Tabs/PerformanceTab', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    PERFORMANCE_TAB_TEST_IDS: {
      CONTAINER: 'rewards-money-performance-tab',
    },
    default: (props: { active: boolean }) => {
      mockPerformanceTab(props);
      return <View testID="rewards-money-performance-tab" />;
    },
  };
});

jest.mock('../components/Benefits/BenefitsPreview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="benefits-preview" />,
  };
});

const mockUseEarningsSummary = useEarningsSummary as jest.MockedFunction<
  typeof useEarningsSummary
>;

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
  recordedEarnings: 'recorded earnings',
  invitedBenefitTitle: 'Your referral benefit',
  invitedReferredBy: 'Referred by',
  invitedOptInDescription: 'Opt in to Rewards to start earning.',
  invitedOptInAction: 'Opt in to Rewards',
  invitedOptInLegal: 'Rewards terms apply.',
} as unknown as ReferralMeDto['localized_text'];

const EARN_RATES = {
  cashback_rate_bps: 500,
  cashback_earning_start: null,
  cashback_earning_end: null,
  revshare_rate_bps: 2500,
  revshare_earning_start: null,
  revshare_earning_end: null,
};

const createReferralMe = (
  overrides: Partial<ReferralMeDto> = {},
): ReferralMeDto => ({
  roles: ['REFERRER'],
  ui_variant: 'REFERRER',
  user_type: 'REGULAR',
  status: 'ACTIVE',
  referral_code: {
    code: 'SOPHIE',
    kind: 'PRIMARY',
    status: 'ACTIVE',
    share_url: null,
  },
  referral_code_status: 'ACTIVE',
  referred_by: null,
  earn_rates: EARN_RATES,
  localized_text: LOCALIZED_TEXT,
  invite_hero: null,
  excluded_regions: [],
  ...overrides,
});

const emptyBranch = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  voided: '0',
  by_claim_family: {},
};

const EARNINGS_SUMMARY = {
  lifetime_total: '0',
  window: null,
  pending: '0',
  claimed: '0',
  voided: '0',
  pairing_pending: false,
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
  identityReady = true,
  subscriptionId = 'sub-123',
  candidateSubscriptionId = subscriptionId,
  referralMeEntry,
  earningsSummaryEntry,
}: {
  profileId?: string;
  hasProfileId?: boolean;
  /** Primary HD keyring loaded. Locked or not-yet-loaded identity stays a skeleton. */
  identityReady?: boolean;
  subscriptionId?: string | null;
  candidateSubscriptionId?: string | 'pending' | 'error' | 'retry' | null;
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
  const sessionProfileId =
    identityReady && hasProfileId ? profileId : undefined;

  return renderWithProvider(<RewardsMoneyDashboard />, {
    state: {
      rewards: {
        candidateSubscriptionId,
      },
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: Boolean(sessionProfileId),
            srpSessionData: sessionProfileId
              ? {
                  [KEYRING_ID]: {
                    profile: { profileId: sessionProfileId },
                  },
                }
              : {},
          },
          KeyringController: {
            isUnlocked: identityReady,
            keyrings: identityReady
              ? [
                  {
                    type: ExtendedKeyringTypes.hd,
                    accounts: [],
                    metadata: { id: KEYRING_ID, name: '' },
                  },
                ]
              : [],
          },
          RewardsController: {
            activeAccount: subscriptionId
              ? { subscriptionId }
              : { subscriptionId: null },
          },
        },
      },
      rewardsMoney: {
        referralMe: hasProfileId
          ? {
              [profileId]: referralMeEntry ?? {
                loading: false,
                error: false,
                data: createReferralMe(),
              },
            }
          : {},
        earningsSummary: hasProfileId
          ? {
              [profileId]: earningsSummaryEntry ?? {
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
    jest.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
    mockParentNavigatorType = 'tab';
    mockBuild.mockReturnValue({ event: 'mock-event' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    mockUseEarningsSummary.mockReturnValue({
      fetchEarningsSummary: jest.fn(),
    });
  });

  describe('analytics', () => {
    it('tracks the loaded Money dashboard once', () => {
      const { rerender } = renderDashboard();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_DASHBOARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        dashboard: 'rewards-money',
        has_subscription: true,
        persona: 'referrer',
        roles: ['referrer'],
      });
      expect(analytics.trackEvent).toHaveBeenCalledWith({
        event: 'mock-event',
      });

      mockCreateEventBuilder.mockClear();
      rerender(<RewardsMoneyDashboard />);

      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    });

    it('does not track while the Money dashboard is loading', () => {
      renderDashboard({
        referralMeEntry: {
          loading: true,
          error: false,
          data: null,
        },
      });

      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    });

    it('does not track while the candidate subscription is pending', () => {
      renderDashboard({
        subscriptionId: null,
        candidateSubscriptionId: 'pending',
      });

      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    });

    it('tracks has_subscription once the candidate subscription resolves', () => {
      const { store } = renderDashboard({
        subscriptionId: null,
        candidateSubscriptionId: 'pending',
      });

      act(() => {
        store.dispatch(setCandidateSubscriptionId('sub-123'));
      });

      expect(mockAddProperties).toHaveBeenCalledWith({
        dashboard: 'rewards-money',
        has_subscription: true,
        persona: 'referrer',
        roles: ['referrer'],
      });
    });

    it('tracks an unsubscribed visit once the candidate lookup finds none', () => {
      const { store } = renderDashboard({
        subscriptionId: null,
        candidateSubscriptionId: 'pending',
      });

      act(() => {
        store.dispatch(setCandidateSubscriptionId(null));
      });

      expect(mockAddProperties).toHaveBeenCalledWith({
        dashboard: 'rewards-money',
        has_subscription: false,
        persona: 'referrer',
        roles: ['referrer'],
      });
    });

    it('does not track the Money dashboard error state', () => {
      renderDashboard({
        referralMeEntry: {
          loading: false,
          error: false,
          data: null,
        },
      });

      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    });
  });

  it('renders the layout skeleton while wallet identity is not loaded', () => {
    const { getByTestId, queryByTestId } = renderDashboard({
      identityReady: false,
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

  it('renders an error with retry when a session re-read settles loading without an error flag', () => {
    const { getByTestId, getByText, queryByTestId } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: false,
        data: null,
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.LOADING),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByText(strings('rewards.referral_details_error.retry_button')),
    );

    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
  });

  it('renders an error with retry when referral me settles without data', () => {
    const { getByTestId, getByText, queryByTestId } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: true,
        data: null,
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByText(strings('rewards.referral_details_error.retry_button')),
    );

    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
  });

  it('renders an error with retry when the session settles without a profile id', () => {
    const { getByTestId } = renderDashboard({
      hasProfileId: false,
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR),
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
      getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CAMPAIGNS_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.BENEFITS_SECTION),
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
          roles: ['REFEREE'],
          ui_variant: 'REFEREE',
          referral_code: null,
          referral_code_status: null,
          referred_by: {
            referral_code: 'SOPHIE',
          },
        }),
      },
    });

    expect(getByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the referee hero without a referrer for a cashback experiment', () => {
    const { getByTestId, queryByTestId, queryByText } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: false,
        data: createReferralMe({
          roles: ['CASHBACK_EXPERIMENT'],
          ui_variant: 'REFEREE',
          referral_code: null,
          referral_code_status: null,
          referred_by: null,
        }),
      },
    });

    expect(getByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(queryByTestId(REFEREE_HERO_CARD_TEST_IDS.REFERRED_BY)).toBeNull();
    expect(queryByText('Referred by')).toBeNull();
  });

  it('fetches the earnings summary for the resolved profile', () => {
    renderDashboard();

    expect(mockUseEarningsSummary).toHaveBeenCalledWith(PROFILE_ID);
  });

  it('feeds the referrer hero the referrals total and trading commissions', () => {
    const { getByText, getByTestId } = renderDashboard();

    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(getByText('$9.15')).toBeOnTheScreen();
    expect(
      getByTestId(REFERER_HERO_CARD_TEST_IDS.TRADE_COMMISSIONS_TOTAL),
    ).toBeOnTheScreen();
  });

  it('feeds the referee hero its own cashback as rebates', () => {
    const { getByText } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: false,
        data: createReferralMe({
          roles: ['REFEREE'],
          ui_variant: 'REFEREE',
          referral_code: null,
          referral_code_status: null,
          referred_by: {
            referral_code: 'SOPHIE',
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
      queryByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CAMPAIGNS_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WAYS_TO_EARN_TAB_TEST_IDS.BENEFITS_SECTION),
    ).not.toBeOnTheScreen();
  });

  it('keeps the hero and hides the banner when referral me refresh fails with cached data', () => {
    const { getByTestId, queryByTestId, queryByText } = renderDashboard({
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
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.REFERRAL_ERROR),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.referral_details_error.retry_button')),
    ).not.toBeOnTheScreen();
    expect(getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
  });

  it('renders no earnings indicator when nothing is claimable', () => {
    const { queryByTestId } = renderDashboard();

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toBeNull();
  });

  it('renders the earnings indicator when a referee can claim at least $1', () => {
    const { getByTestId } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: false,
        data: createReferralMe({ roles: ['REFEREE'], ui_variant: 'REFEREE' }),
      },
      earningsSummaryEntry: {
        loading: false,
        error: false,
        data: {
          ...EARNINGS_SUMMARY,
          claimable: '1000000',
          self_earned: {
            ...EARNINGS_SUMMARY.self_earned,
            by_claim_family: {
              REFERRAL_TRADE_FEE_CASHBACK: {
                ...emptyBranch,
                lifetime: '7650000',
                claimable: '1000000',
              },
            },
          },
        } as unknown as EarningsSummaryDto,
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toHaveStyle({
      position: 'absolute',
      top: 4,
      right: -4,
      width: 6,
      height: 6,
    });
  });

  it('renders no earnings indicator for a referrer with cashback of at least $1', () => {
    const { queryByTestId } = renderDashboard({
      earningsSummaryEntry: {
        loading: false,
        error: false,
        data: {
          ...EARNINGS_SUMMARY,
          claimable: '1000000',
          self_earned: {
            ...EARNINGS_SUMMARY.self_earned,
            by_claim_family: {
              REFERRAL_TRADE_FEE_CASHBACK: {
                ...emptyBranch,
                lifetime: '7650000',
                claimable: '1000000',
              },
            },
          },
        } as unknown as EarningsSummaryDto,
      },
    });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toBeNull();
  });

  it('switches to the Earnings tab body', () => {
    const { getByTestId, queryByTestId } = renderDashboard();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB));

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY),
    ).toBeOnTheScreen();
    expect(getByTestId('rewards-money-earnings-tab')).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY),
    ).toBeNull();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PERFORMANCE_BODY),
    ).toBeNull();
  });

  it('hides the earnings indicator when only claimed balance is positive', () => {
    const { queryByTestId } = renderDashboard({
      earningsSummaryEntry: {
        loading: false,
        error: false,
        data: { ...EARNINGS_SUMMARY, claimable: '0', claimed: '50' },
      },
    });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toBeNull();
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
    expect(mockPerformanceTab).toHaveBeenLastCalledWith(
      expect.objectContaining({ active: true }),
    );
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY),
    ).toBeNull();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY),
    ).toBeNull();
  });

  it('returns the shared scroller to the top when the selected tab changes', () => {
    const scrollTo = jest.fn();
    const scrollToSpy = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(scrollTo);
    const { getByTestId } = renderDashboard();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB),
    );
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PERFORMANCE_TAB),
    );
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PERFORMANCE_TAB),
    );
    expect(scrollTo).toHaveBeenCalledTimes(1);

    scrollToSpy.mockRestore();
  });

  it('mounts a tab only while it is selected', () => {
    const { getByTestId, queryByTestId } = renderDashboard();

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY),
    ).toBeNull();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PERFORMANCE_BODY),
    ).toBeNull();
    expect(mockPerformanceTab).not.toHaveBeenCalled();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PERFORMANCE_TAB),
    );
    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB),
    );

    expect(queryByTestId('rewards-money-performance-tab')).toBeNull();
    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY),
    ).toBeOnTheScreen();
  });

  it('pads a short panel so the title clip can scroll into view', () => {
    const { getByTestId } = renderDashboard({ subscriptionId: null });

    fireEvent(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.TITLE_SECTION),
      'layout',
      {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 64 } },
      },
    );
    fireEvent(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SCROLL_VIEW),
      'layout',
      {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 652 } },
      },
    );
    fireEvent(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PANEL), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 640 } },
    });

    expect(
      StyleSheet.flatten(
        getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SCROLL_CLIP_SPACER).props
          .style,
      ).height,
    ).toBe(76);
  });

  it('leaves a tall panel without a clip spacer', () => {
    const { getByTestId, queryByTestId } = renderDashboard();

    fireEvent(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.TITLE_SECTION),
      'layout',
      {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 64 } },
      },
    );
    fireEvent(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SCROLL_VIEW),
      'layout',
      {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 652 } },
      },
    );
    fireEvent(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.PANEL), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } },
    });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SCROLL_CLIP_SPACER),
    ).toBeNull();
  });
});
