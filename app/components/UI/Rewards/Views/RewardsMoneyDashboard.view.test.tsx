/**
 * Rewards Money dashboard through the shared preset.
 *
 * Absorbs the earnings-history journey from #37974.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyDashboard.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from './RewardsMoneyDashboard.testIds';
import { REFEREE_HERO_CARD_TEST_IDS } from '../components/Money/RefereeHeroCard';
import { REFERER_HERO_CARD_TEST_IDS } from '../components/Money/RefererHeroCard';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from '../components/Money/RewardsOptInSection';
import { SHARE_CODE_SHEET_TEST_IDS } from '../components/Money/ShareCodeSheet';
import { WAYS_TO_EARN_TAB_TEST_IDS } from '../components/Money/Tabs/WaysToEarnTab.testIds';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../components/Money/ClaimableRewardsCard.testIds';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows.testIds';
import { EARNINGS_TAB_TEST_IDS } from '../components/Money/Tabs/EarningsTab.testIds';
import { REWARDS_TAB_SKELETON_TEST_IDS } from '../components/RewardsTabSkeleton/RewardsTabSkeleton';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  renderRewardsHome,
  renderRewardsMoneyDashboard,
} from '../../../../../tests/component-view/renderers/rewardsMoney';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  EARNINGS_HISTORY_ROW,
  earningsSummaryFixture,
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
  REWARDS_MONEY_PROFILE_ID,
} from '../../../../../tests/component-view/presets/rewardsMoney';

const SHARE_URL = 'https://link.metamask.io/invite?code=SOPHIE';
const SHARE_HOME_REF_URL = 'https://link.metamask.io/home?ref=SOPHIE';
const ONBOARDING_IMAGE_TEST_ID = 'onboarding-main-image';

/** Rev-share $41.75 and follow-trade commission $9.15, on top of $7.65 cashback. */
function summaryWithCommissions(): EarningsSummaryDto {
  const summary = earningsSummaryFixture({ revShareLifetime: '41750000' });
  return {
    ...summary,
    earned_by_others: {
      ...summary.earned_by_others,
      by_claim_family: {
        ...summary.earned_by_others.by_claim_family,
        SOCIAL_FOLLOW_TRADE: {
          lifetime: '9150000',
          claimable: '0',
          held: '0',
          blocked: '0',
          voided: '0',
          pending: '0',
          claimed: '0',
        },
      },
    },
  };
}

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
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB));

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY),
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
      within(historyRow).getByText(REFERRAL_LOCALIZED_TEXT.historyRebate),
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
        summaryCalls.some((call) =>
          Boolean((call[1] as { from?: string })?.from),
        ),
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

    fireEvent.press(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_HEADER));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_EARNINGS_HISTORY_VIEW),
      ),
    ).toBeOnTheScreen();
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

describe('RewardsHome money routing', () => {
  const summary = summaryWithCommissions();

  it('lands an unsubscribed referrer on the code, commission, and opt-in', async () => {
    const { findByTestId, findByText, getByTestId, queryByTestId } =
      renderRewardsHome({
        persona: 'referrer',
        summary,
      });

    expect(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(await findByText('$41.75')).toBeOnTheScreen();

    const hero = getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER);
    expect(
      within(hero).getByTestId(REFERER_HERO_CARD_TEST_IDS.REFERRAL_CODE),
    ).toHaveTextContent('SOPHIE');
    expect(
      within(
        within(hero).getByTestId(
          REFERER_HERO_CARD_TEST_IDS.TRADE_COMMISSIONS_TOTAL,
        ),
      ).getByText('$9.15'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CAMPAIGNS_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WAYS_TO_EARN_TAB_TEST_IDS.BENEFITS_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(REFERER_HERO_CARD_TEST_IDS.TERMS_INFO_BUTTON));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.MODAL.REWARDS_MONEY_TERMS_SHEET),
      ),
    ).toBeOnTheScreen();
  });

  it('lands an unsubscribed referee on cashback and hides the referrer card', async () => {
    const { findByTestId, findByText, queryByTestId } = renderRewardsHome({
      persona: 'referee',
      summary,
    });

    expect(
      await findByTestId(REFEREE_HERO_CARD_TEST_IDS.REFERRAL_CODE),
    ).toHaveTextContent('SOPHIE');
    expect(await findByText('$7.65')).toBeOnTheScreen();
    expect(
      within(
        await findByTestId(
          REFEREE_HERO_CARD_TEST_IDS.TRADING_COMMISSIONS_TOTAL,
        ),
      ).getByText('$9.15'),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('shows campaigns and benefits for a subscribed referrer', async () => {
    const { findByTestId, getByTestId, queryByTestId } = renderRewardsHome({
      persona: 'referrer',
      subscriptionId: 'sub-1',
      summary,
    });

    expect(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CAMPAIGNS_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.BENEFITS_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).toBeOnTheScreen();
  });

  it('keeps a plain user on onboarding', async () => {
    const { findByTestId, queryByTestId } = renderRewardsHome({
      persona: 'plain',
    });

    expect(await findByTestId(ONBOARDING_IMAGE_TEST_ID)).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('opens the points dashboard for a subscribed user with no Money persona', async () => {
    const { findByTestId, queryByTestId } = renderRewardsHome({
      persona: 'plain',
      subscriptionId: 'sub-1',
    });

    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(queryByTestId(ONBOARDING_IMAGE_TEST_ID)).not.toBeOnTheScreen();
  });

  it('keeps a referrer on the points path when Money is disabled', async () => {
    const { findByTestId, queryByTestId } = renderRewardsHome({
      persona: 'referrer',
      moneyControllerEnabled: false,
      subscriptionId: 'sub-1',
    });

    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('falls back to the points dashboard when referral me rejects with no cache', async () => {
    const { findByTestId, queryByTestId } = renderRewardsHome({
      persona: 'plain',
      subscriptionId: 'sub-1',
      referralCache: 'omit',
      referralMeFetch: 'reject',
    });

    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR),
    ).not.toBeOnTheScreen();
  });

  it('shows the tab skeleton and no home while referral me is pending', async () => {
    const { findByTestId, queryByTestId } = renderRewardsHome({
      referralCache: 'omit',
      referralMeFetch: 'pending',
    });

    expect(
      await findByTestId(REWARDS_TAB_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(queryByTestId(ONBOARDING_IMAGE_TEST_ID)).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW),
    ).not.toBeOnTheScreen();
  });

  it('retries a settled-empty referral read with forceFresh', async () => {
    const { engine, findByTestId, getByText } = renderRewardsMoneyDashboard({
      persona: 'plain',
      referralCache: 'empty',
      handlers: {
        'AuthenticationController:getSessionProfile': () =>
          Promise.resolve({ profileId: REWARDS_MONEY_PROFILE_ID }),
      },
    });

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByText(strings('rewards.referral_details_error.retry_button')),
    );

    await waitFor(() => {
      expect(engine).toHaveBeenCalledWith(
        'RewardsMoneyController:getReferralMe',
        { forceFresh: true },
      );
    });
  });

  it('opens the in-app share sheet with the server share url', async () => {
    jest.mocked(Clipboard.setString).mockClear();
    const { findByTestId, getByTestId } = renderRewardsHome({
      persona: 'referrer',
      summary,
    });

    fireEvent.press(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.SHARE_BUTTON),
    );

    expect(
      await findByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SHARE_CODE_SHEET_TEST_IDS.QR, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(SHARE_CODE_SHEET_TEST_IDS.COPY_LINK));

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
    expect(Clipboard.setString).toHaveBeenCalledWith(SHARE_URL);
  });

  it('opens the in-app share sheet with the home ref fallback', async () => {
    jest.mocked(Clipboard.setString).mockClear();
    const referralMe = referralMeFixture('referrer');
    const { findByTestId, getByTestId } = renderRewardsHome({
      persona: 'referrer',
      summary,
      referralMe: {
        ...referralMe,
        referral_code: referralMe.referral_code
          ? { ...referralMe.referral_code, share_url: null }
          : null,
      },
    });

    fireEvent.press(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.SHARE_BUTTON),
    );

    fireEvent.press(await findByTestId(SHARE_CODE_SHEET_TEST_IDS.COPY_LINK));

    expect(Clipboard.setString).toHaveBeenCalledWith(SHARE_HOME_REF_URL);
  });

  it('hides share when the referral code is paused', async () => {
    const referralMe = referralMeFixture('referrer');
    const { findByTestId, getByTestId, queryByTestId } = renderRewardsHome({
      persona: 'referrer',
      summary,
      referralMe: {
        ...referralMe,
        referral_code_status: 'PAUSED',
        referral_code: referralMe.referral_code
          ? { ...referralMe.referral_code, status: 'PAUSED' }
          : null,
      },
    });

    expect(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REFERER_HERO_CARD_TEST_IDS.REFERRAL_CODE),
    ).toHaveTextContent('-');
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.SHARE_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
