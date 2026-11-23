import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { earnRatesFixture } from '../../../../../tests/component-view/presets/rewardsMoney';
import { setCandidateSubscriptionId } from '../../../../actions/rewards';
import type {
  EarningsSummaryDto,
  MechanismsView,
  ReferralMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import { strings } from '../../../../../locales/i18n';
import renderWithProvider from '../../../../util/test/renderWithProvider';

jest.mock('../../../../selectors/featureFlagController/socialV1', () => ({
  selectIsSocialV1Enabled: jest.fn(() => true),
}));
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

// The Campaigns and Benefits tabs and their opt-in card are covered through
// real state in RewardsMoneyDashboard.view.test.tsx. They are stubbed here so
// this suite does not load the Engine.
jest.mock('../components/Money/RewardsOptInSection', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/Money/Tabs/CampaignsTab', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/Money/Tabs/BenefitsTab', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../components/Money/Tabs/WaysToEarnTab', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="rewards-money-ways-to-earn-tab" />,
  };
});

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

const mockUseEarningsSummary = useEarningsSummary as jest.MockedFunction<
  typeof useEarningsSummary
>;

const LOCALIZED_TEXT = {
  waysToEarn: 'Ways to earn',
  earningsTab: 'Earn',
  earnEligibleFees: 'Earn on eligible fees',
  yourReferralCode: 'Your referral code',
  share: 'Share',
  shareCode: 'Share code',
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

const EARN_RATES: ReferralMeDto['earn_rates'] = earnRatesFixture({
  cashback_rate_bps: 500,
  revshare_rate_bps: 2500,
  revshare_by_product: {
    perps: { rate_bps: 2500, source: 'DEFAULT' },
    swaps: { rate_bps: 2500, source: 'DEFAULT' },
    predict: null,
  },
  cashback_by_product: {
    perps: { rate_bps: 500, source: null },
    swaps: { rate_bps: 500, source: null },
    predict: null,
  },
});

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
  commissionMechanisms,
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
  commissionMechanisms?: MechanismsView;
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
        commissionMechanisms:
          hasProfileId && commissionMechanisms
            ? { [profileId]: commissionMechanisms }
            : {},
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

  it('keeps the tab and hides the banner when referral me refresh fails with cached data', () => {
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
      queryByText(strings('rewards.referral_details_error.retry_button')),
    ).not.toBeOnTheScreen();
  });

  it('renders no earnings indicator when nothing is claimable', () => {
    const { queryByTestId } = renderDashboard();

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
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
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
    ).toHaveStyle({
      position: 'absolute',
      top: 4,
      right: -4,
      width: 6,
      height: 6,
    });
  });

  it('renders the earnings indicator for a referrer with cashback of at least $1', () => {
    const { getByTestId } = renderDashboard({
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
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
    ).toBeOnTheScreen();
  });

  it('renders the earnings indicator when revenue share is held for tax and its claim route is open', () => {
    const { getByTestId } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: false,
        data: createReferralMe({
          localized_text: {
            ...LOCALIZED_TEXT,
            taxFormUrl: 'https://tax.example/form',
          },
        }),
      },
      commissionMechanisms: {
        REFERRAL_REV_SHARE: { claim_open: true, reason: null },
        SOCIAL_FOLLOW_TRADE: {
          claim_open: false,
          reason: 'MECHANISM_NOT_CLAIMABLE',
        },
      },
      earningsSummaryEntry: {
        loading: false,
        error: false,
        data: {
          ...EARNINGS_SUMMARY,
          claimable: '0',
          held: '1000000',
          earned_by_others: {
            ...EARNINGS_SUMMARY.earned_by_others,
            by_claim_family: {
              REFERRAL_REV_SHARE: {
                ...emptyBranch,
                held: '1000000',
                blocking_reason: 'TAX_DETERMINATION_REQUIRED',
              },
            },
          },
        } as unknown as EarningsSummaryDto,
      },
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
    ).toBeOnTheScreen();
  });

  it('renders no earnings indicator when tax-held revenue share has a closed claim route', () => {
    const { queryByTestId } = renderDashboard({
      referralMeEntry: {
        loading: false,
        error: false,
        data: createReferralMe({
          localized_text: {
            ...LOCALIZED_TEXT,
            taxFormUrl: 'https://tax.example/form',
          },
        }),
      },
      commissionMechanisms: {
        REFERRAL_REV_SHARE: {
          claim_open: false,
          reason: 'MECHANISM_NOT_CLAIMABLE',
        },
        SOCIAL_FOLLOW_TRADE: {
          claim_open: false,
          reason: 'MECHANISM_NOT_CLAIMABLE',
        },
      },
      earningsSummaryEntry: {
        loading: false,
        error: false,
        data: {
          ...EARNINGS_SUMMARY,
          claimable: '0',
          held: '1000000',
          earned_by_others: {
            ...EARNINGS_SUMMARY.earned_by_others,
            by_claim_family: {
              REFERRAL_REV_SHARE: {
                ...emptyBranch,
                held: '1000000',
                blocking_reason: 'TAX_DETERMINATION_REQUIRED',
              },
            },
          },
        } as unknown as EarningsSummaryDto,
      },
    });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
    ).toBeNull();
  });

  it('renders no earnings indicator when only a closed revenue-share balance is claimable', () => {
    const { queryByTestId } = renderDashboard({
      earningsSummaryEntry: {
        loading: false,
        error: false,
        data: {
          ...EARNINGS_SUMMARY,
          claimable: '1000000',
          earned_by_others: {
            ...EARNINGS_SUMMARY.earned_by_others,
            by_claim_family: {
              REFERRAL_REV_SHARE: {
                ...emptyBranch,
                lifetime: '41750000',
                claimable: '1000000',
              },
            },
          },
        } as unknown as EarningsSummaryDto,
      },
    });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
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
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
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

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB));
    expect(scrollTo).toHaveBeenCalledTimes(1);

    scrollToSpy.mockRestore();
  });

  it('mounts a tab only while it is selected', () => {
    const { getByTestId, queryByTestId } = renderDashboard();

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY),
    ).toBeNull();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB));
    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB),
    );

    expect(queryByTestId('rewards-money-earnings-tab')).toBeNull();
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
