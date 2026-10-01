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
import RefereeHeroCard, { REFEREE_HERO_CARD_TEST_IDS } from './RefereeHeroCard';

jest.mock('../../hooks/useEarningsSummary');
jest.mock('../../hooks/useReferralMe');

const PROFILE_ID = 'profile-a';
const mockFetchEarningsSummary = jest.fn();
const mockFetchReferralMe = jest.fn();

const LOCALIZED_TEXT = {
  invitedBenefitTitle: 'Your referral benefit',
  invitedReferredBy: 'Referred by',
  tradingCommissionsSection: 'Trading commissions',
  tradingRebates: 'Trading rebates',
  recordedEarnings: 'recorded claims',
} as unknown as ReferralLocalizedText;

const REFERRED_BY = {
  referral_code: 'INVITER',
  earning_start: null,
  earning_end: null,
};

const emptyBranch = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  by_claim_family: {},
};

const SUMMARY = {
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
      SOCIAL_FOLLOW_TRADE: { ...emptyBranch, lifetime: '4800000' },
    },
  },
} as unknown as EarningsSummaryDto;

describe('RefereeHeroCard', () => {
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
      <RefereeHeroCard
        profileId={PROFILE_ID}
        referredBy={REFERRED_BY}
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

  it('renders the inviter, own cashback as rebates, and follow-trade as commission', () => {
    const { getByTestId, getByText, queryByRole } = renderHero({
      summary: SUMMARY,
    });

    expect(getByText('INVITER')).toBeOnTheScreen();
    expect(
      getByTestId(REFEREE_HERO_CARD_TEST_IDS.TRADING_REBATES_TOTAL),
    ).toBeOnTheScreen();
    expect(getByText('$7.65')).toBeOnTheScreen();
    expect(getByText('$4.80')).toBeOnTheScreen();
    expect(queryByRole('button', { name: 'Share' })).not.toBeOnTheScreen();
  });

  it('renders without totals when the summary has not landed', () => {
    const { getByTestId, queryByText } = renderHero();

    expect(getByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(queryByText('$7.65')).not.toBeOnTheScreen();
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
      summary: SUMMARY,
      earningsError: true,
    });

    expect(getByText('$7.65')).toBeOnTheScreen();
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
      getByTestId(REFEREE_HERO_CARD_TEST_IDS.REFERRAL_ERROR).findByProps({
        accessibilityRole: 'button',
      }),
    );

    expect(
      queryByTestId(REFEREE_HERO_CARD_TEST_IDS.EARNINGS_ERROR),
    ).not.toBeOnTheScreen();
    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
    expect(mockFetchEarningsSummary).not.toHaveBeenCalled();
  });

  it('renders the error banner before the identity block', () => {
    const { getByTestId } = renderHero({ earningsError: true });
    const container = getByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER);
    const childTestIds = container.children.map((child) =>
      typeof child === 'string' ? undefined : child.props.testID,
    );

    expect(
      childTestIds.indexOf(REFEREE_HERO_CARD_TEST_IDS.EARNINGS_ERROR),
    ).toBeLessThan(childTestIds.indexOf(REFEREE_HERO_CARD_TEST_IDS.IDENTITY));
  });
});
