import React from 'react';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import RewardsEarningsBanners from './RewardsEarningsBanners';
import { REWARDS_HELD_BANNER_TEST_IDS } from './RewardsHeldBanner.testIds';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from './RewardsPausedBanner.testIds';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  };
});

const LOCALIZED_TEXT = {
  rewardsPausedBanner: '{amount} of rewards paused.',
  rewardsPausedLearnMore: 'Learn more',
  rewardsHeldBanner: '{heldAmount} of rewards held.',
  rewardsHeldLearnMore: 'Learn more',
} as unknown as ReferralLocalizedText;

const emptyFamily = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  voided: '0',
};

const SUMMARY = {
  self_earned: {
    ...emptyFamily,
    by_claim_family: {
      REFERRAL_TRADE_FEE_CASHBACK: {
        ...emptyFamily,
        blocked: '2000000',
        blocking_reason: 'UNDER_REVIEW',
      },
    },
  },
  earned_by_others: {
    ...emptyFamily,
    by_claim_family: {
      SOCIAL_FOLLOW_TRADE: {
        ...emptyFamily,
        held: '56000000',
        blocking_reason: 'TAX_DETERMINATION_REQUIRED',
      },
    },
  },
} as unknown as EarningsSummaryDto;

describe('RewardsEarningsBanners', () => {
  it('shows both banners, paused first, for an unscoped summary', () => {
    const { getByTestId } = renderWithProvider(
      <RewardsEarningsBanners
        summary={SUMMARY}
        localizedText={LOCALIZED_TEXT}
      />,
    );

    expect(
      getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toHaveTextContent('$2.00 of rewards paused.Learn more');
    expect(getByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER)).toHaveTextContent(
      '$56.00 of rewards held.Learn more',
    );
  });

  it('shows only the scoped family\u2019s banner', () => {
    const { queryByTestId } = renderWithProvider(
      <RewardsEarningsBanners
        summary={SUMMARY}
        localizedText={LOCALIZED_TEXT}
        scope={{ branch: 'earned_by_others', family: 'SOCIAL_FOLLOW_TRADE' }}
      />,
    );

    expect(queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER)).toBeNull();
    expect(
      queryByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER),
    ).toBeOnTheScreen();
  });

  it('renders nothing without a summary', () => {
    const { queryByTestId } = renderWithProvider(
      <RewardsEarningsBanners summary={null} localizedText={LOCALIZED_TEXT} />,
    );

    expect(queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER)).toBeNull();
    expect(queryByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER)).toBeNull();
  });
});
