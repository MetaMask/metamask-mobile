import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import { SHARE_CODE_SHEET_TEST_IDS } from './ShareCodeSheet';
import RefererHeroCard, { REFERER_HERO_CARD_TEST_IDS } from './RefererHeroCard';

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
  it('renders the code and both earned-by-others totals as USD', () => {
    const { getByText } = renderWithProvider(
      <RefererHeroCard
        referralCode={REFERRAL_CODE}
        localizedText={LOCALIZED_TEXT}
        earningsSummary={buildSummary({
          REFERRAL_REV_SHARE: { lifetime: '41750000' },
          SOCIAL_FOLLOW_TRADE: { lifetime: '9150000' },
        })}
        isEarningsLoading={false}
      />,
      { state: { user: { appTheme: AppThemeKey.light } } },
    );

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

    const { queryByText } = renderWithProvider(
      <RefererHeroCard
        referralCode={REFERRAL_CODE}
        localizedText={LOCALIZED_TEXT}
        earningsSummary={summary}
        isEarningsLoading={false}
      />,
      { state: { user: { appTheme: AppThemeKey.light } } },
    );

    expect(queryByText('$99.00')).not.toBeOnTheScreen();
  });

  it('omits an amount the summary does not carry rather than printing zero', () => {
    const { queryByText, getByText } = renderWithProvider(
      <RefererHeroCard
        referralCode={REFERRAL_CODE}
        localizedText={LOCALIZED_TEXT}
        earningsSummary={buildSummary({
          REFERRAL_REV_SHARE: { lifetime: '41750000' },
        })}
        isEarningsLoading={false}
      />,
      { state: { user: { appTheme: AppThemeKey.light } } },
    );

    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(queryByText('$0.00')).not.toBeOnTheScreen();
  });

  it('shows no totals while the summary is still loading', () => {
    const { queryByText } = renderWithProvider(
      <RefererHeroCard
        referralCode={REFERRAL_CODE}
        localizedText={LOCALIZED_TEXT}
        earningsSummary={null}
        isEarningsLoading
      />,
      { state: { user: { appTheme: AppThemeKey.light } } },
    );

    expect(queryByText('$41.75')).not.toBeOnTheScreen();
  });

  it('opens the inline share sheet from the Share button', () => {
    const { getByTestId } = renderWithProvider(
      <RefererHeroCard
        referralCode={{ ...REFERRAL_CODE, share_url: null }}
        localizedText={LOCALIZED_TEXT}
        earningsSummary={null}
        isEarningsLoading={false}
      />,
      { state: { user: { appTheme: AppThemeKey.light } } },
    );

    fireEvent.press(getByTestId(REFERER_HERO_CARD_TEST_IDS.SHARE_BUTTON));

    expect(getByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER)).toBeOnTheScreen();
  });
});
