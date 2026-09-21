import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import { useEarningsSummary } from '../../hooks/useEarningsSummary';
import { useReferralMe } from '../../hooks/useReferralMe';
import { SHARE_CODE_SHEET_TEST_IDS } from './ShareCodeSheet';
import RefererHeroCard, { REFERER_HERO_CARD_TEST_IDS } from './RefererHeroCard';

jest.mock('../../hooks/useEarningsSummary');
jest.mock('../../hooks/useReferralMe');

const PROFILE_ID = 'profile-a';
const mockFetchEarningsSummary = jest.fn();
const mockFetchReferralMe = jest.fn();

const LOCALIZED_TEXT = {
  earnEligibleFees: 'Earn on eligible fees',
  yourReferralCode: 'Your referral code',
  share: 'Share',
  historyReferrals: 'Referrals',
  tradeCommissions: 'Trade commissions',
  recordedEarnings: 'recorded claims',
  shareCode: 'Share code',
} as unknown as ReferralLocalizedText;

const REFERRAL_CODE = {
  code: 'SOPHIE',
  kind: 'VANITY',
  status: 'ACTIVE',
  share_url: 'https://link.metamask.io/home?ref=SOPHIE',
} as const;

const emptyBranch = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  by_claim_family: {},
};

const buildSummary = (
  earnedByOthers: Record<string, { lifetime: string }>,
): EarningsSummaryDto =>
  ({
    lifetime_total: '0',
    window: null,
    pending: '0',
    claimed: '0',
    forfeited: '0',
    minimum_musd_base_units: '1000000',
    self_earned: emptyBranch,
    earned_by_others: {
      ...emptyBranch,
      by_claim_family: earnedByOthers,
    },
  }) as EarningsSummaryDto;

describe('RefererHeroCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      useEarningsSummary as jest.MockedFunction<typeof useEarningsSummary>
    ).mockReturnValue({
      fetchEarningsSummary: mockFetchEarningsSummary,
    });
    (
      useReferralMe as jest.MockedFunction<typeof useReferralMe>
    ).mockReturnValue({
      profileId: PROFILE_ID,
      fetchReferralMe: mockFetchReferralMe,
    });
  });

  const renderHero = ({
    summary = null,
    earningsLoading = false,
    earningsError = false,
    referralError = false,
  }: {
    summary?: EarningsSummaryDto | null;
    earningsLoading?: boolean;
    earningsError?: boolean;
    referralError?: boolean;
  } = {}) =>
    renderWithProvider(
      <RefererHeroCard
        profileId={PROFILE_ID}
        referralCode={REFERRAL_CODE}
        localizedText={LOCALIZED_TEXT}
      />,
      {
        state: {
          user: { appTheme: AppThemeKey.light },
          rewardsMoney: {
            referralMe: {
              [PROFILE_ID]: {
                loading: false,
                error: referralError,
                data: null,
              },
            },
            earningsSummary: {
              [PROFILE_ID]: {
                loading: earningsLoading,
                error: earningsError,
                data: summary,
              },
            },
          },
        },
      },
    );

  it('renders the code and both earned-by-others totals as USD', () => {
    const { getByText } = renderHero({
      summary: buildSummary({
        REFERRAL_REV_SHARE: { lifetime: '41750000' },
        SOCIAL_FOLLOW_TRADE: { lifetime: '9150000' },
      }),
    });

    expect(getByText('SOPHIE')).toBeOnTheScreen();
    expect(getByText('Earn on eligible fees')).toBeOnTheScreen();
    expect(getByText('Referrals')).toBeOnTheScreen();
    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(getByText('Trade commissions')).toBeOnTheScreen();
    expect(getByText('$9.15')).toBeOnTheScreen();
  });

  it('does not read the referrer totals off the self-earned branch', () => {
    const summary = buildSummary({}) as EarningsSummaryDto;
    summary.self_earned.by_claim_family = {
      REFERRAL_REV_SHARE: {
        ...emptyBranch,
        lifetime: '99000000',
        by_address: [],
      },
    } as unknown as EarningsSummaryDto['self_earned']['by_claim_family'];

    const { queryByText } = renderHero({ summary });

    expect(queryByText('$99.00')).not.toBeOnTheScreen();
  });

  it('omits an amount the summary does not carry rather than printing zero', () => {
    const { queryByText, getByText } = renderHero({
      summary: buildSummary({
        REFERRAL_REV_SHARE: { lifetime: '41750000' },
      }),
    });

    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(queryByText('$0.00')).not.toBeOnTheScreen();
  });

  it('shows no totals while the summary is still loading', () => {
    const { queryByText } = renderHero({ earningsLoading: true });

    expect(queryByText('$41.75')).not.toBeOnTheScreen();
  });

  it('shows referral-me error inside the hero and retries it force fresh', () => {
    const { getByText } = renderHero({ referralError: true });

    fireEvent.press(
      getByText(strings('rewards.referral_details_error.retry_button')),
    );

    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
  });

  it('shows a dash on metric cards when the summary failed without cached data', () => {
    const { getAllByText, queryByText } = renderHero({ earningsError: true });

    expect(getAllByText('-')).toHaveLength(2);
    expect(queryByText('$0.00')).not.toBeOnTheScreen();
  });

  it('shows earnings error above stale totals and retries it force fresh', () => {
    const { getByText } = renderHero({
      summary: buildSummary({
        REFERRAL_REV_SHARE: { lifetime: '41750000' },
      }),
      earningsError: true,
    });

    expect(getByText('$41.75')).toBeOnTheScreen();
    fireEvent.press(
      getByText(strings('rewards.referral_details_error.retry_button')),
    );

    expect(mockFetchEarningsSummary).toHaveBeenCalledWith({
      forceFresh: true,
    });
  });

  it('shows only the referral error and retries referral me when both requests fail', () => {
    const { getByTestId, queryByTestId } = renderHero({
      referralError: true,
      earningsError: true,
    });

    fireEvent.press(
      getByTestId(REFERER_HERO_CARD_TEST_IDS.REFERRAL_ERROR).findByProps({
        accessibilityRole: 'button',
      }),
    );

    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.EARNINGS_ERROR),
    ).not.toBeOnTheScreen();
    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
    expect(mockFetchEarningsSummary).not.toHaveBeenCalled();
  });

  it('renders the error banner before the identity block', () => {
    const { getByTestId } = renderHero({ referralError: true });
    const container = getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER);
    const childTestIds = container.children.map((child) =>
      typeof child === 'string' ? undefined : child.props.testID,
    );

    expect(
      childTestIds.indexOf(REFERER_HERO_CARD_TEST_IDS.REFERRAL_ERROR),
    ).toBeLessThan(childTestIds.indexOf(REFERER_HERO_CARD_TEST_IDS.IDENTITY));
  });

  it('opens the inline share sheet from the Share button', () => {
    const { getByTestId } = renderWithProvider(
      <RefererHeroCard
        profileId={PROFILE_ID}
        referralCode={{ ...REFERRAL_CODE, share_url: null }}
        localizedText={LOCALIZED_TEXT}
      />,
      {
        state: {
          user: { appTheme: AppThemeKey.light },
          rewardsMoney: {
            referralMe: {},
            earningsSummary: {},
          },
        },
      },
    );

    fireEvent.press(getByTestId(REFERER_HERO_CARD_TEST_IDS.SHARE_BUTTON));

    expect(getByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER)).toBeOnTheScreen();
  });
});
