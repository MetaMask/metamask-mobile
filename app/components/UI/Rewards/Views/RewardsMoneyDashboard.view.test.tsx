/**
 * Rewards tab landing through the real referral-me fetch.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyDashboard.view.test.tsx --runInBand --silent --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Routes from '../../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  installRewardsMoneyEngine,
  renderRewardsHome,
  renderRewardsMoneyDashboard,
} from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  earningsSummaryFixture,
  referralMeFixture,
} from '../../../../../tests/component-view/presets/rewardsMoney';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from './RewardsMoneyDashboard.testIds';
import { REFERER_HERO_CARD_TEST_IDS } from '../components/Money/RefererHeroCard.testIds';
import { REFEREE_HERO_CARD_TEST_IDS } from '../components/Money/RefereeHeroCard.testIds';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from '../components/Money/RewardsOptInSection.testIds';
import { REWARDS_TAB_SKELETON_TEST_IDS } from '../components/RewardsTabSkeleton/RewardsTabSkeleton.testIds';
import { SHARE_CODE_SHEET_TEST_IDS } from '../components/Money/ShareCodeSheet.testIds';
import { ONBOARDING_MAIN_STEP_TEST_IDS } from '../components/Onboarding/OnboardingMainStep.testIds';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

const SHARE_HOME_REF_URL = 'https://link.metamask.io/home?ref=SOPHIE';
const SHARE_URL = 'https://link.metamask.io/invite?code=SOPHIE';

describeForPlatforms('RewardsMoneyDashboard', () => {
  it('lands an unsubscribed referrer on the code, commission, and opt-in', async () => {
    const engine = installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFERRER'),
    });

    const { findByTestId, findByText, getByTestId, queryByTestId } =
      renderRewardsHome();

    expect(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(await findByText('$41.75')).toBeOnTheScreen();

    const hero = getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER);
    expect(
      within(hero).getByTestId(REFERER_HERO_CARD_TEST_IDS.REFERRAL_CODE),
    ).toHaveTextContent('SOPHIE');
    expect(within(hero).getByText('$41.75')).toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.TRADE_COMMISSIONS_TOTAL),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    ).not.toBeOnTheScreen();
    expect(engine).toHaveBeenCalledWith(
      'RewardsMoneyController:getEarningsSummary',
      { forceFresh: undefined },
    );

    fireEvent.press(getByTestId(REFERER_HERO_CARD_TEST_IDS.TERMS_INFO_BUTTON));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.MODAL.REWARDS_MONEY_TERMS_SHEET),
      ),
    ).toBeOnTheScreen();
  });

  it('lands an unsubscribed referee on cashback and hides the referrer card', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFEREE'),
    });

    const { findByTestId, findByText, queryByTestId } = renderRewardsHome();

    expect(
      await findByTestId(REFEREE_HERO_CARD_TEST_IDS.REFERRAL_CODE),
    ).toHaveTextContent('SOPHIE');
    expect(await findByText('$7.65')).toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('shows campaigns, benefits, and settings for a subscribed referrer', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFERRER'),
    });

    const { findByTestId, getByTestId, queryByTestId } = renderRewardsHome({
      subscribed: true,
    });

    expect(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_SECTION),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.SETTINGS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_FLOW)),
    ).toBeOnTheScreen();
  });

  it('keeps a plain user on onboarding', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('NONE'),
    });

    const { findByTestId, queryByTestId } = renderRewardsHome();

    expect(
      await findByTestId(ONBOARDING_MAIN_STEP_TEST_IDS.IMAGE),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('opens the points dashboard for a subscribed user with no Money persona', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('NONE'),
    });

    const { findByTestId, getByTestId, queryByTestId } = renderRewardsHome({
      subscribed: true,
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
      queryByTestId(ONBOARDING_MAIN_STEP_TEST_IDS.IMAGE),
    ).not.toBeOnTheScreen();

    // The points dashboard opens the not-opted-in sheet, which hides the
    // screen underneath. Settings stays mounted on that screen.
    fireEvent.press(
      getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON, {
        includeHiddenElements: true,
      }),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_FLOW)),
    ).toBeOnTheScreen();
  });

  it('keeps a referrer on the points path when Money is disabled', async () => {
    const referralMe = referralMeFixture('REFERRER');
    installRewardsMoneyEngine({ referralMe });

    const { findByTestId, getByTestId, queryByTestId } = renderRewardsHome({
      moneyEnabled: false,
      subscribed: true,
      referralMe,
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

    fireEvent.press(
      getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON, {
        includeHiddenElements: true,
      }),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_FLOW)),
    ).toBeOnTheScreen();
  });

  it('falls back to the points dashboard when referral me rejects with no cache', async () => {
    installRewardsMoneyEngine({ referralMe: 'reject' });

    const { findByTestId, getByTestId, queryByTestId } = renderRewardsHome({
      subscribed: true,
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

    fireEvent.press(
      getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON, {
        includeHiddenElements: true,
      }),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_FLOW)),
    ).toBeOnTheScreen();
  });

  it('shows the tab skeleton and no home while referral me is pending', async () => {
    installRewardsMoneyEngine({ referralMe: 'pending' });

    const { findByTestId, queryByTestId } = renderRewardsHome();

    expect(
      await findByTestId(REWARDS_TAB_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(ONBOARDING_MAIN_STEP_TEST_IDS.IMAGE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW),
    ).not.toBeOnTheScreen();
  });

  it('retries a settled-empty referral read with forceFresh', async () => {
    const engine = installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFERRER'),
    });

    const { findByTestId, getByTestId } = renderRewardsMoneyDashboard();

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.ERROR),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.RETRY));

    // fetchReferralMe queues behind an already-resolved promise, so the
    // Engine call lands on a later turn.
    await waitFor(() => {
      expect(engine).toHaveBeenCalledWith(
        'RewardsMoneyController:getReferralMe',
        {
          forceFresh: true,
        },
      );
    });
  });

  it('opens the in-app share sheet with the server share url', async () => {
    jest.mocked(Clipboard.setString).mockClear();
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFERRER', {
        referral_code: { share_url: SHARE_URL },
      }),
    });

    const { findByTestId, getByTestId } = renderRewardsHome();

    fireEvent.press(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.SHARE_BUTTON),
    );

    expect(
      await findByTestId(SHARE_CODE_SHEET_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    // The sheet marks the QR graphic accessibility-hidden. The copy action
    // writes the same resolved URL the QR encodes.
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
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFERRER'),
    });

    const { findByTestId, getByTestId } = renderRewardsHome();

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
    expect(Clipboard.setString).toHaveBeenCalledWith(SHARE_HOME_REF_URL);
  });

  it('hides share when the referral code is paused', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFERRER', {
        referral_code_status: 'PAUSED',
      }),
    });

    const { findByTestId, getByTestId, queryByTestId } = renderRewardsHome();

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

  it('shows the earnings dot when the summary has a claimable balance', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFERRER'),
      earningsSummary: earningsSummaryFixture({ claimable: '50' }),
    });

    const { findByTestId, getByTestId } = renderRewardsHome();

    expect(
      await findByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB_DOT),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB));

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_BODY),
    ).toBeOnTheScreen();
  });
});
