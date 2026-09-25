import React from 'react';
import type { ReferralMeDto } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { REFERER_HERO_CARD_TEST_IDS } from '../RefererHeroCard';
import { REFEREE_HERO_CARD_TEST_IDS } from '../RefereeHeroCard';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from '../RewardsOptInSection';
import WaysToEarnTab, { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab';

const PROFILE_ID = 'profile-a';

jest.mock('../../../hooks/useEarningsSummary', () => ({
  useEarningsSummary: () => ({
    fetchEarningsSummary: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useReferralMe', () => ({
  useReferralMe: () => ({
    fetchReferralMe: jest.fn(),
  }),
  useSessionProfileId: jest.fn(),
}));

jest.mock('../RewardsOptInSection', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    REWARDS_OPT_IN_SECTION_TEST_IDS: {
      CONTAINER: 'rewards-opt-in-section',
    },
    default: () => <View testID="rewards-opt-in-section" />,
  };
});

jest.mock('../../Campaigns/CampaignsPreview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="campaigns-preview" />,
  };
});

jest.mock('../../Benefits/BenefitsPreview', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="benefits-preview" />,
  };
});

const LOCALIZED_TEXT = {
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
  earn_rates: {
    revshare_rate_bps: 2500,
    cashback_rate_bps: 500,
    revshare_earning_term_minutes: null,
    cashback_earning_term_minutes: null,
  },
  localized_text: LOCALIZED_TEXT,
  invite_hero: null,
  ...overrides,
});

const renderTab = ({
  referralMe = createReferralMe(),
  isSubscribed = true,
}: {
  referralMe?: ReferralMeDto;
  isSubscribed?: boolean;
} = {}) =>
  renderWithProvider(
    <WaysToEarnTab
      profileId={PROFILE_ID}
      referralMe={referralMe}
      isSubscribed={isSubscribed}
    />,
    {
      state: {
        rewardsMoney: {
          referralMe: {
            [PROFILE_ID]: {
              loading: false,
              error: false,
              data: referralMe,
            },
          },
          earningsSummary: {},
          referralFunnel: {},
          commissions: {},
          cashbackLedger: {},
        },
      },
    },
  );

describe('WaysToEarnTab', () => {
  it('renders the referrer hero and subscribed previews', () => {
    const { getByTestId, queryByTestId } = renderTab();

    expect(getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(
      getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CAMPAIGNS_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.BENEFITS_SECTION),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the referee hero without the referrer share card', () => {
    const { getByTestId, queryByTestId } = renderTab({
      referralMe: createReferralMe({
        role: 'REFEREE',
        variant: 'REFEREE',
        referral_code: null,
        referred_by: {
          referral_code: 'SOPHIE',
          earning_start: null,
          earning_end: null,
        },
      }),
    });

    expect(getByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders opt-in instead of campaigns when unsubscribed', () => {
    const { getByTestId, queryByTestId } = renderTab({ isSubscribed: false });

    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CAMPAIGNS_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WAYS_TO_EARN_TAB_TEST_IDS.BENEFITS_SECTION),
    ).not.toBeOnTheScreen();
  });
});
