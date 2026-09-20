import React from 'react';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import RefereeHeroCard, { REFEREE_HERO_CARD_TEST_IDS } from './RefereeHeroCard';

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
  it('renders the inviter, own cashback as rebates, and follow-trade as commission', () => {
    const { getByTestId, getByText, queryByRole } = renderWithProvider(
      <RefereeHeroCard
        referredBy={REFERRED_BY}
        localizedText={LOCALIZED_TEXT}
        earningsSummary={SUMMARY}
        isEarningsLoading={false}
      />,
      { state: { user: { appTheme: AppThemeKey.light } } },
    );

    expect(getByText('INVITER')).toBeOnTheScreen();
    expect(
      getByTestId(REFEREE_HERO_CARD_TEST_IDS.TRADING_REBATES_TOTAL),
    ).toBeOnTheScreen();
    expect(getByText('$7.65')).toBeOnTheScreen();
    expect(getByText('$4.80')).toBeOnTheScreen();
    expect(queryByRole('button', { name: 'Share' })).not.toBeOnTheScreen();
  });

  it('renders without totals when the summary has not landed', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <RefereeHeroCard
        referredBy={REFERRED_BY}
        localizedText={LOCALIZED_TEXT}
        earningsSummary={null}
        isEarningsLoading={false}
      />,
      { state: { user: { appTheme: AppThemeKey.light } } },
    );

    expect(getByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(queryByText('$7.65')).not.toBeOnTheScreen();
  });
});
