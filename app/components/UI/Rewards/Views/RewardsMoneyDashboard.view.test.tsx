/**
 * Rewards tab landing through the real referral-me fetch.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyDashboard.view.test.tsx --runInBand --silent --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { within } from '@testing-library/react-native';
import {
  installRewardsMoneyEngine,
  renderRewardsHome,
} from '../../../../../tests/component-view/renderers/rewardsMoney';
import { referralMeFixture } from '../../../../../tests/component-view/presets/rewardsMoney';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from './RewardsMoneyDashboard';
import { REFERER_HERO_CARD_TEST_IDS } from '../components/Money/RefererHeroCard';
import { REFEREE_HERO_CARD_TEST_IDS } from '../components/Money/RefereeHeroCard';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from '../components/Money/RewardsOptInSection';
import { REWARDS_TAB_SKELETON_TEST_IDS } from '../components/RewardsTabSkeleton/RewardsTabSkeleton';

describeForPlatforms('RewardsMoneyDashboard', () => {
  it('lands a referrer on the Money dashboard with the code and commission', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFERRER'),
    });

    const { findByTestId, findByText, getByTestId } = renderRewardsHome();

    expect(
      await findByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(await findByText('$41.75')).toBeOnTheScreen();

    const hero = getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER);
    expect(
      within(hero).getByTestId(REFERER_HERO_CARD_TEST_IDS.REFERRAL_CODE),
    ).toHaveTextContent('SOPHIE');
    expect(within(hero).getByText('$41.75')).toBeOnTheScreen();
  });

  it('lands a referee on the Money dashboard', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFEREE'),
    });

    const { findByTestId, queryByTestId } = renderRewardsHome();

    expect(
      await findByTestId(REFEREE_HERO_CARD_TEST_IDS.REFERRAL_CODE),
    ).toHaveTextContent('SOPHIE');
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('keeps a plain user off the Money dashboard', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('NONE'),
    });

    const { findByTestId, queryByTestId } = renderRewardsHome();

    expect(await findByTestId('onboarding-main-image')).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('shows the Rewards tab skeleton while referral me is pending', async () => {
    installRewardsMoneyEngine({ referralMe: 'pending' });

    const { findByTestId, queryByTestId } = renderRewardsHome();

    expect(
      await findByTestId(REWARDS_TAB_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('shows opt-in instead of campaigns and benefits for an unsubscribed referee', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFEREE'),
    });

    const { findByTestId, queryByTestId } = renderRewardsHome();

    expect(
      await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CAMPAIGNS_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.BENEFITS_SECTION),
    ).not.toBeOnTheScreen();
  });
});
