/**
 * Rewards Money dashboard through the shared preset.
 *
 * Absorbs the earnings-history journey from #37974.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyDashboard.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  CampaignType,
  type CampaignDto,
  type SubscriptionBenefitDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from './RewardsMoneyDashboard.testIds';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../components/Money/ClaimableRewardsCard.testIds';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows.testIds';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from '../components/Money/RewardsOptInSection';
import { SHARE_CODE_SHEET_TEST_IDS } from '../components/Money/ShareCodeSheet';
import { BENEFITS_TAB_TEST_IDS } from '../components/Money/Tabs/BenefitsTab.testIds';
import { WAYS_TO_EARN_TAB_TEST_IDS } from '../components/Money/Tabs/WaysToEarnTab.testIds';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { FLOATING_HEADER_FADE_TEST_ID } from '../../../../component-library/components-temp/HeaderGlass/HeaderGlass';
import { renderRewardsMoneyDashboard } from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  EARNINGS_HISTORY_ROW,
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../tests/component-view/presets/rewardsMoney';

function callsFor(engine: jest.Mock, action: string): unknown[][] {
  return engine.mock.calls.filter((call) => call[0] === action);
}

describe('RewardsMoneyDashboard', () => {
  it('opens the earnings history from a claimable referee summary', async () => {
    const { getByTestId, findByTestId, engine } = renderRewardsMoneyDashboard({
      persona: 'referee',
      summary: CLAIMABLE_EARNINGS_SUMMARY,
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_BODY),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$5.00');
    const historyRow = await findByTestId(
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-${EARNINGS_HISTORY_ROW.id}`,
    );
    expect(
      within(historyRow).getByText(REFERRAL_LOCALIZED_TEXT.rebateSwaps),
    ).toBeOnTheScreen();
    expect(within(historyRow).getByText('+$1.00')).toBeOnTheScreen();

    await waitFor(() => {
      const summaryCalls = callsFor(
        engine,
        'RewardsMoneyController:getEarningsSummary',
      );
      expect(
        summaryCalls.some((call) => !(call[1] as { from?: string })?.from),
      ).toBe(true);
      expect(
        callsFor(engine, 'RewardsMoneyController:getEarningsLedger'),
      ).toEqual(
        expect.arrayContaining([
          [
            'RewardsMoneyController:getEarningsLedger',
            expect.objectContaining({ includeClaims: true }),
          ],
        ]),
      );
    });

    fireEvent.press(getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.HISTORY_HEADER));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_EARNINGS_HISTORY_VIEW),
      ),
    ).toBeOnTheScreen();
  });

  it('refetches the earnings summary once when Retry is pressed after a 503 (E4, RWDS-1674)', async () => {
    let rejectSummary = true;
    const { findByTestId, queryByTestId, engine } = renderRewardsMoneyDashboard(
      {
        persona: 'referee',
        summary: null,
        handlers: {
          'RewardsMoneyController:getEarningsSummary': async () => {
            if (rejectSummary) {
              throw new RewardsMoneyHttpError(
                'Get earnings summary failed: 503',
                503,
                JSON.stringify({ reason: 'SERVER_BUSY' }),
                2,
              );
            }
            return CLAIMABLE_EARNINGS_SUMMARY;
          },
        },
      },
    );

    // The rejected earnings summary renders the error banner.
    const banner = await findByTestId(WAYS_TO_EARN_TAB_TEST_IDS.SUMMARY_ERROR);
    const summaryCallsBeforeRetry = callsFor(
      engine,
      'RewardsMoneyController:getEarningsSummary',
    ).length;
    const ledgerCallsBeforeRetry = callsFor(
      engine,
      'RewardsMoneyController:getEarningsLedger',
    ).length;

    rejectSummary = false;
    fireEvent.press(
      within(banner).getByText(
        strings('rewards.referral_details_error.retry_button'),
      ),
    );

    // The retried earnings summary replaces the error banner.
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$5.00');
    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:getEarningsSummary'),
      ).toHaveLength(summaryCallsBeforeRetry + 1);
    });
    expect(
      callsFor(engine, 'RewardsMoneyController:getEarningsLedger'),
    ).toHaveLength(ledgerCallsBeforeRetry);
    expect(
      queryByTestId(WAYS_TO_EARN_TAB_TEST_IDS.SUMMARY_ERROR),
    ).not.toBeOnTheScreen();
  });
});

describe('RewardsMoneyDashboard share code', () => {
  function activeRefereeReferral() {
    return {
      ...referralMeFixture('referee'),
      referral_code_status: 'ACTIVE' as const,
      referral_code: {
        code: 'SOPHIE',
        kind: 'standard',
        status: 'ACTIVE',
        share_url: 'https://link.metamask.io/invite?code=SOPHIE',
      },
    };
  }

  it('opens the share code sheet from the header for an active referrer code', async () => {
    const { findByTestId, getByTestId } = renderRewardsMoneyDashboard({
      persona: 'referrer',
      moneyControllerEnabled: true,
      subscriptionId: 'sub-1',
    });

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON));

    expect(
      await findByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('opens the share code sheet from the header for a referee with an active code', async () => {
    const { findByTestId, getByTestId } = renderRewardsMoneyDashboard({
      persona: 'referee',
      moneyControllerEnabled: true,
      referralMe: activeRefereeReferral(),
    });

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON));

    expect(
      await findByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('opens the share code sheet when only the code record is active', async () => {
    const { findByTestId, getByTestId } = renderRewardsMoneyDashboard({
      persona: 'referrer',
      moneyControllerEnabled: true,
      subscriptionId: 'sub-1',
      referralMe: {
        ...referralMeFixture('referrer'),
        referral_code_status: null,
      },
    });

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON));

    expect(
      await findByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('leaves the header share control off when the active code is blank', async () => {
    const referrer = referralMeFixture('referrer');
    const { findByTestId, getByTestId, queryByTestId } =
      renderRewardsMoneyDashboard({
        persona: 'referrer',
        moneyControllerEnabled: true,
        subscriptionId: 'sub-1',
        referralMe: {
          ...referrer,
          referral_code: referrer.referral_code
            ? { ...referrer.referral_code, code: '   ' }
            : null,
        },
      });

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_SETTINGS_VIEW)),
    ).toBeOnTheScreen();
  });

  it('leaves the header share control off when the referral code is paused', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderRewardsMoneyDashboard({
        persona: 'referrer',
        moneyControllerEnabled: true,
        subscriptionId: 'sub-1',
        referralMe: {
          ...referralMeFixture('referrer'),
          referral_code_status: 'PAUSED',
        },
      });

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_SETTINGS_VIEW)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SHARE_BUTTON),
    ).not.toBeOnTheScreen();
  });
});

describe('RewardsMoneyDashboard settings', () => {
  const subscribed = { subscriptionId: 'sub-1' };

  async function openDashboard(
    options: Parameters<typeof renderRewardsMoneyDashboard>[0] = {},
  ) {
    const view = renderRewardsMoneyDashboard({
      persona: 'plain',
      moneyControllerEnabled: true,
      ...options,
    });
    expect(
      await view.findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    return view;
  }

  it('opens settings from a cached referral when there is no subscription', async () => {
    const { getByTestId, findByTestId } = await openDashboard();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_SETTINGS_VIEW)),
    ).toBeOnTheScreen();
  });

  it('hides settings without a subscription when the profile is a referrer', async () => {
    const { queryByTestId } = await openDashboard({ persona: 'referrer' });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides settings without a subscription in an excluded region', async () => {
    const { queryByTestId } = await openDashboard({
      geoLocation: 'GB',
      referralMe: {
        ...referralMeFixture('plain'),
        excluded_regions: ['GB'],
      },
    });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('keeps Ways to earn and Earnings visible in an excluded region (A4)', async () => {
    const { getByTestId, queryByTestId } = await openDashboard({
      geoLocation: 'GB',
      referralMe: {
        ...referralMeFixture('plain'),
        excluded_regions: ['GB'],
      },
    });

    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB),
    ).toBeOnTheScreen();
  });

  it('opens settings when subscribed even if the profile is a referrer', async () => {
    const { getByTestId, findByTestId } = await openDashboard({
      ...subscribed,
      persona: 'referrer',
    });

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_SETTINGS_VIEW)),
    ).toBeOnTheScreen();
  });
});

describe('RewardsMoneyDashboard glass header', () => {
  it('floats the header over the content when glass headers are on', async () => {
    const { findByTestId, getByTestId } = renderRewardsMoneyDashboard({
      persona: 'plain',
      moneyControllerEnabled: true,
      subscriptionId: 'sub-1',
      glassHeaders: true,
    });

    expect(await findByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_SETTINGS_VIEW)),
    ).toBeOnTheScreen();
  });

  it('keeps the solid header when glass headers are off', async () => {
    const { findByTestId, queryByTestId } = renderRewardsMoneyDashboard({
      persona: 'plain',
      moneyControllerEnabled: true,
    });

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).not.toBeOnTheScreen();
  });
});

const ACTIVE_CAMPAIGN: CampaignDto = {
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Tokenized stocks campaign',
  startDate: '2020-01-01T00:00:00.000Z',
  endDate: '2099-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
};

const BENEFIT: SubscriptionBenefitDto = {
  id: 7,
  longTitle: 'Priority support',
  shortDescription: 'Faster help from the support team.',
  longDescription: 'Faster help from the support team.',
  thumbnail: 'https://example.test/benefit.png',
  validFrom: '2020-01-01T00:00:00.000Z',
  validTo: null,
  url: 'https://example.test/benefit',
  actionDate: null,
  chain: 'eip155:1',
  type: { id: 1, name: 'perk' },
};

const subscriptionReads = {
  'RewardsController:getCampaigns': async () => [ACTIVE_CAMPAIGN],
  'RewardsController:getBenefits': async () => ({
    benefits: [BENEFIT],
    limit: 200,
    lastFetched: 0,
  }),
};

/**
 * A read handler whose first call fails and whose later calls never settle, so
 * a test can observe the tab mid-request after an error. `reads.count` is the
 * number of calls so far.
 */
const failFirstThenHang = (message: string) => {
  const reads = { count: 0 };
  const handler = async () => {
    reads.count += 1;
    if (reads.count === 1) {
      throw new Error(message);
    }
    return new Promise(() => undefined);
  };
  return { handler, reads };
};

describe('RewardsMoneyDashboard campaigns and benefits tabs (RWDS-1725)', () => {
  it('labels the first tab Overview and keeps campaigns and benefits out of it', async () => {
    const { findByTestId, queryByTestId } = renderRewardsMoneyDashboard({
      persona: 'referee',
      subscriptionId: 'sub-1',
      handlers: subscriptionReads,
    });

    // The tab renders its label twice: once visible, once to reserve the
    // selected-state width.
    expect(
      within(
        await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB),
      ).getAllByText(REFERRAL_LOCALIZED_TEXT.overviewTab),
    ).not.toHaveLength(0);
    expect(
      await findByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION),
    ).not.toBeOnTheScreen();
  });

  it('lists every campaign and benefit in its own tab for an opted-in user', async () => {
    const {
      findByTestId,
      findByText,
      getByTestId,
      queryByTestId,
      queryByText,
    } = renderRewardsMoneyDashboard({
      persona: 'referee',
      subscriptionId: 'sub-1',
      handlers: subscriptionReads,
    });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );

    expect(
      within(
        await findByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_ACTIVE_SECTION),
      ).getByText(ACTIVE_CAMPAIGN.name),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB));

    expect(await findByText(BENEFIT.longTitle)).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.benefits.list_header')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_BODY),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('holds skeletons, not empty states, while the first reads are pending', async () => {
    const pending = async () => new Promise(() => undefined);
    const { findByTestId, getByTestId, queryByText } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionId: 'sub-1',
        handlers: {
          'RewardsController:getCampaigns': pending,
          'RewardsController:getBenefits': pending,
        },
      });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_BODY),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.campaigns_view.empty_state')),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.campaigns_view.error_title')),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB));

    expect(
      await findByTestId(`${BENEFITS_TAB_TEST_IDS.SKELETON}-0`),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.benefits.empty-list')),
    ).not.toBeOnTheScreen();
  });

  it('shows the benefits empty state once an empty list has loaded', async () => {
    const { findByTestId, findByText, queryByTestId } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionId: 'sub-1',
        handlers: {
          ...subscriptionReads,
          'RewardsController:getBenefits': async () => ({
            benefits: [],
            limit: 200,
            lastFetched: 0,
          }),
        },
      });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB),
    );

    expect(
      await findByText(strings('rewards.benefits.empty-list')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${BENEFITS_TAB_TEST_IDS.SKELETON}-0`),
    ).not.toBeOnTheScreen();
  });

  it('holds a skeleton, not the opt-in, while the subscription lookup is pending', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionLookupPending: true,
        geoLocation: 'US',
      });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SUBSCRIPTION_PENDING),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB));

    expect(
      within(
        await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_BODY),
      ).getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SUBSCRIPTION_PENDING),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('reports a failed benefits read and recovers on Retry', async () => {
    let failBenefits = true;
    const { findByTestId, findByText, getByText, queryByText } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionId: 'sub-1',
        handlers: {
          ...subscriptionReads,
          'RewardsController:getBenefits': async () => {
            if (failBenefits) {
              throw new Error('benefits unavailable');
            }
            return { benefits: [BENEFIT], limit: 200, lastFetched: 0 };
          },
        },
      });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB),
    );

    expect(await findByTestId(BENEFITS_TAB_TEST_IDS.ERROR)).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.benefits.empty-list')),
    ).not.toBeOnTheScreen();

    failBenefits = false;
    fireEvent.press(getByText(strings('rewards.benefits.retry_button')));

    expect(await findByText(BENEFIT.longTitle)).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.benefits.error_title')),
    ).not.toBeOnTheScreen();
  });

  it('keeps the benefits error up while the tab re-reads on a later visit', async () => {
    const benefits = failFirstThenHang('benefits unavailable');
    const { findByTestId, getByTestId, queryByText } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionId: 'sub-1',
        handlers: {
          ...subscriptionReads,
          'RewardsController:getBenefits': benefits.handler,
        },
      });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB),
    );
    expect(await findByTestId(BENEFITS_TAB_TEST_IDS.ERROR)).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );
    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB));

    await waitFor(() => {
      expect(benefits.reads.count).toBeGreaterThan(1);
    });
    expect(getByTestId(BENEFITS_TAB_TEST_IDS.ERROR)).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.benefits.empty-list')),
    ).not.toBeOnTheScreen();
  });

  it('reports a failed campaigns read and recovers on Retry', async () => {
    let failCampaigns = true;
    const { findByTestId, findByText, getByText, queryByText } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionId: 'sub-1',
        handlers: {
          ...subscriptionReads,
          'RewardsController:getCampaigns': async () => {
            if (failCampaigns) {
              throw new Error('campaigns unavailable');
            }
            return [ACTIVE_CAMPAIGN];
          },
        },
      });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );

    expect(
      await findByText(strings('rewards.campaigns_view.error_title')),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.campaigns_view.empty_state')),
    ).not.toBeOnTheScreen();

    failCampaigns = false;
    fireEvent.press(getByText(strings('rewards.campaigns_view.retry_button')));

    expect(await findByText(ACTIVE_CAMPAIGN.name)).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.campaigns_view.error_title')),
    ).not.toBeOnTheScreen();
  });

  it('keeps the campaigns error up while Retry is in flight', async () => {
    const campaigns = failFirstThenHang('campaigns unavailable');
    const { findByText, findByTestId, getByText, queryByText } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionId: 'sub-1',
        handlers: {
          ...subscriptionReads,
          'RewardsController:getCampaigns': campaigns.handler,
        },
      });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );
    fireEvent.press(
      await findByText(strings('rewards.campaigns_view.retry_button')),
    );

    await waitFor(() => {
      expect(campaigns.reads.count).toBe(2);
    });
    expect(
      getByText(strings('rewards.campaigns_view.error_title')),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.campaigns_view.empty_state')),
    ).not.toBeOnTheScreen();
  });

  it('keeps the campaigns error up while the tab re-reads on a later visit', async () => {
    const campaigns = failFirstThenHang('campaigns unavailable');
    const { findByText, findByTestId, getByTestId, queryByText } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionId: 'sub-1',
        handlers: {
          ...subscriptionReads,
          'RewardsController:getCampaigns': campaigns.handler,
        },
      });

    fireEvent.press(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );
    expect(
      await findByText(strings('rewards.campaigns_view.error_title')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB));
    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );

    await waitFor(() => {
      expect(campaigns.reads.count).toBeGreaterThan(1);
    });
    expect(
      await findByText(strings('rewards.campaigns_view.error_title')),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('rewards.campaigns_view.empty_state')),
    ).not.toBeOnTheScreen();
  });

  it('asks for the opt-in in both tabs until the user has a Rewards subscription', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderRewardsMoneyDashboard({
        persona: 'referee',
        subscriptionId: null,
        geoLocation: 'US',
      });

    expect(
      await findByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_TAB),
    );

    const campaignsOptIn = within(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_BODY),
    );
    expect(
      campaignsOptIn.getByText(REFERRAL_LOCALIZED_TEXT.invitedOptInTitle),
    ).toBeOnTheScreen();
    expect(
      campaignsOptIn.getByText(REFERRAL_LOCALIZED_TEXT.invitedOptInDescription),
    ).toBeOnTheScreen();
    expect(
      campaignsOptIn.getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION),
    ).toHaveTextContent(REFERRAL_LOCALIZED_TEXT.invitedOptInAction);

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_TAB));

    expect(
      within(
        await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_BODY),
      ).getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });
});
