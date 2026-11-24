/**
 * Next steps on the Overview tab: which rows show for each persona, and where each one goes.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/WaysToEarnTab.nextSteps.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { formatCampaignDate } from '../../Campaigns/CampaignTile.utils';
import {
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../../../tests/component-view/render';
import {
  renderWaysToEarnTab,
  restoreRewardsDashboardStore,
} from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';
import { avatarIconNameIn } from '../testUtils';
import { EARN_ACTION_SECTION_TEST_IDS } from './EarnActionSection.testIds';
import { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab.testIds';

const ROW = EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_ROW;

function refereeWithRoles(roles: string[]) {
  return {
    ...referralMeFixture('referee'),
    roles,
  } as ReturnType<typeof referralMeFixture>;
}

describe('WaysToEarnTab next steps', () => {
  afterEach(() => {
    restoreRewardsDashboardStore();
  });

  it('lists Refer friends and Post trades for a referrer', async () => {
    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderWaysToEarnTab({ persona: 'referrer' });

    expect(
      await findByTestId(EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_HEADER),
    ).toBeOnTheScreen();
    expect(getByText(REFERRAL_LOCALIZED_TEXT.nextSteps)).toBeOnTheScreen();
    expect(getByText(REFERRAL_LOCALIZED_TEXT.referFriends)).toBeOnTheScreen();
    expect(
      getByText(REFERRAL_LOCALIZED_TEXT.earnEligibleFees),
    ).toBeOnTheScreen();
    expect(avatarIconNameIn(getByTestId(`${ROW}-referrals`))).toBe(
      IconName.UserCircleAdd,
    );
    expect(getByText(REFERRAL_LOCALIZED_TEXT.postTrades)).toBeOnTheScreen();
    expect(
      getByText(REFERRAL_LOCALIZED_TEXT.copyTradingInfoDescription),
    ).toBeOnTheScreen();
    expect(avatarIconNameIn(getByTestId(`${ROW}-social`))).toBe(
      IconName.People,
    );
    expect(queryByTestId(`${ROW}-trading`)).toBeNull();
  });

  it('opens the share code sheet from Refer friends', async () => {
    const onOpenShareCode = jest.fn();
    const { findByTestId } = renderWaysToEarnTab({
      persona: 'referrer',
      onOpenShareCode,
    });

    fireEvent.press(await findByTestId(`${ROW}-referrals`));

    expect(onOpenShareCode).toHaveBeenCalledTimes(1);
  });

  it('lists Trade and earn for a referee and opens the trade tray', async () => {
    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderWaysToEarnTab({ persona: 'referee' });

    const tradeRow = await findByTestId(`${ROW}-trading`);
    expect(getByText(REFERRAL_LOCALIZED_TEXT.tradeAndEarn)).toBeOnTheScreen();
    expect(
      getByText(REFERRAL_LOCALIZED_TEXT.invitedBenefitTitle),
    ).toBeOnTheScreen();
    expect(avatarIconNameIn(getByTestId(`${ROW}-trading`))).toBe(
      IconName.SwapVertical,
    );
    expect(queryByTestId(`${ROW}-referrals`)).toBeNull();

    fireEvent.press(tradeRow);

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.MODAL.TRADE_WALLET_ACTIONS),
      ),
    ).toBeOnTheScreen();
  });

  it('starts the Social flow from Post trades', async () => {
    const { findByTestId } = renderWaysToEarnTab({ persona: 'referee' });

    fireEvent.press(await findByTestId(`${ROW}-social`));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.SOCIAL.PROFILE_ONBOARDING)),
    ).toBeOnTheScreen();
  });

  it('leaves out Trade and earn for a referee who only copy trades', async () => {
    const { findByTestId, queryByTestId } = renderWaysToEarnTab({
      persona: 'referee',
      referralMe: refereeWithRoles(['COPY_TRADING']),
    });

    expect(await findByTestId(`${ROW}-social`)).toBeOnTheScreen();
    expect(queryByTestId(`${ROW}-trading`)).toBeNull();
  });

  it('lists only Post trades for a plain user', async () => {
    const { findByTestId, queryByTestId } = renderWaysToEarnTab({
      persona: 'plain',
    });

    expect(await findByTestId(`${ROW}-social`)).toBeOnTheScreen();
    expect(queryByTestId(`${ROW}-referrals`)).toBeNull();
    expect(queryByTestId(`${ROW}-trading`)).toBeNull();
  });

  it('omits Post trades while Social V1 is off', async () => {
    const { findByTestId, queryByTestId } = renderWaysToEarnTab({
      persona: 'referrer',
      socialV1: false,
    });

    expect(await findByTestId(`${ROW}-referrals`)).toBeOnTheScreen();
    expect(queryByTestId(`${ROW}-social`)).toBeNull();
  });

  describe('not opted in to Rewards', () => {
    it('offers the opt-in and opens the Campaigns tab', async () => {
      const onOpenCampaigns = jest.fn();
      const { findByTestId, getByText, getByTestId } = renderWaysToEarnTab({
        persona: 'plain',
        subscriptionId: null,
        onOpenCampaigns,
      });

      const row = await findByTestId(`${ROW}-campaign`);

      expect(
        getByText(REFERRAL_LOCALIZED_TEXT.invitedOptInTitle),
      ).toBeOnTheScreen();
      expect(
        getByText(REFERRAL_LOCALIZED_TEXT.invitedOptInDescription),
      ).toBeOnTheScreen();
      expect(avatarIconNameIn(getByTestId(`${ROW}-campaign`))).toBe(
        IconName.Trophy,
      );

      fireEvent.press(row);

      expect(onOpenCampaigns).toHaveBeenCalledTimes(1);
    });

    it('falls back to the translated copy when the served title and description are missing', async () => {
      const referralMe = {
        ...referralMeFixture('referee'),
        localized_text: {
          ...REFERRAL_LOCALIZED_TEXT,
          invitedOptInTitle: undefined,
          invitedOptInDescription: undefined,
        },
      } as unknown as ReturnType<typeof referralMeFixture>;
      const { findByText } = renderWaysToEarnTab({
        persona: 'referee',
        referralMe,
        subscriptionId: null,
      });

      expect(
        await findByText(strings('rewards.campaign.opt_in_section_title')),
      ).toBeOnTheScreen();
      expect(
        await findByText(
          strings('rewards.campaign.opt_in_section_description'),
        ),
      ).toBeOnTheScreen();
    });

    it('waits for the subscription lookup before offering it', async () => {
      const { findByTestId, queryByTestId } = renderWaysToEarnTab({
        persona: 'plain',
        subscriptionId: null,
        subscriptionLookupPending: true,
      });

      expect(await findByTestId(`${ROW}-social`)).toBeOnTheScreen();
      expect(queryByTestId(`${ROW}-campaign`)).toBeNull();
    });
  });

  describe('live campaign', () => {
    const campaign = (overrides: Partial<CampaignDto>): CampaignDto => ({
      id: 'campaign-1',
      type: CampaignType.ONDO_HOLDING,
      name: 'Tokenized stocks campaign',
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: '2099-12-31T23:59:59.999Z',
      termsAndConditions: null,
      excludedRegions: [],
      details: null,
      featured: false,
      showUpcomingDate: false,
      ...overrides,
    });

    const withCampaigns = (campaigns: CampaignDto[]) => ({
      subscriptionId: 'sub-1',
      handlers: { 'RewardsController:getCampaigns': async () => campaigns },
    });

    it('offers the most recently started live campaign to every user', async () => {
      const newest = campaign({
        id: 'campaign-2',
        type: CampaignType.PERPS_TRADING,
        name: 'Perps trading competition',
        startDate: '2021-01-01T00:00:00.000Z',
        endDate: '2098-06-30T00:00:00.000Z',
      });
      const { findByTestId, getByText, getByTestId, queryByText } =
        renderWaysToEarnTab({
          persona: 'plain',
          ...withCampaigns([
            campaign({}),
            newest,
            campaign({
              id: 'campaign-3',
              name: 'Ended campaign',
              startDate: '2022-01-01T00:00:00.000Z',
              endDate: '2022-02-01T00:00:00.000Z',
            }),
          ]),
        });

      const row = await findByTestId(`${ROW}-campaign`);

      expect(row).toBeOnTheScreen();
      expect(
        getByText(
          strings('rewards.campaign.join_campaign', {
            campaignName: newest.name,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('rewards.campaign.live_until_date', {
            date: formatCampaignDate(new Date(newest.endDate)),
          }),
        ),
      ).toBeOnTheScreen();
      expect(avatarIconNameIn(getByTestId(`${ROW}-campaign`))).toBe(
        IconName.Trophy,
      );
      expect(queryByText(/Tokenized stocks campaign/u)).toBeNull();
      expect(queryByText(/Ended campaign/u)).toBeNull();
    });

    it('opens the campaign details', async () => {
      const { findByTestId } = renderWaysToEarnTab({
        persona: 'plain',
        ...withCampaigns([
          campaign({
            id: 'campaign-2',
            type: CampaignType.PERPS_TRADING,
            name: 'Perps trading competition',
          }),
        ]),
      });

      fireEvent.press(await findByTestId(`${ROW}-campaign`));

      const params = await findByTestId(
        getRouteParamsProbeTestId(
          Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
        ),
      );
      expect(JSON.parse(params.props.children as string)).toEqual({
        campaignId: 'campaign-2',
      });
    });

    it('is the only row for a plain user while Social V1 is off', async () => {
      const { findByTestId, queryByTestId } = renderWaysToEarnTab({
        persona: 'plain',
        socialV1: false,
        ...withCampaigns([campaign({})]),
      });

      expect(await findByTestId(`${ROW}-campaign`)).toBeOnTheScreen();
      expect(queryByTestId(`${ROW}-social`)).toBeNull();
    });

    it('is left out when no campaign is live', async () => {
      const { findByTestId, queryByTestId } = renderWaysToEarnTab({
        persona: 'referrer',
        ...withCampaigns([
          campaign({ startDate: '2099-01-01T00:00:00.000Z' }),
          campaign({
            id: 'campaign-3',
            startDate: '2022-01-01T00:00:00.000Z',
            endDate: '2022-02-01T00:00:00.000Z',
          }),
        ]),
      });

      expect(await findByTestId(`${ROW}-referrals`)).toBeOnTheScreen();
      expect(queryByTestId(`${ROW}-campaign`)).toBeNull();
    });
  });

  it('omits the section for an opted-in plain user with no live campaign while Social V1 is off', async () => {
    const { findByTestId, queryByTestId } = renderWaysToEarnTab({
      persona: 'plain',
      socialV1: false,
      subscriptionId: 'sub-1',
    });

    expect(
      await findByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS)).toBeNull();
    expect(
      queryByTestId(EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_HEADER),
    ).toBeNull();
  });
});
