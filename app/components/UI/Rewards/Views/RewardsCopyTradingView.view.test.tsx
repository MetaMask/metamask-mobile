/**
 * Earn destination pages, driven through real Redux state: the held banner
 * follows the family a hold belongs to.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsCopyTradingView.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import { EARN_FAMILY_EARNINGS_TEST_IDS } from '../components/Money/EarnFamilyEarningsSection.testIds';
import { REWARDS_HELD_BANNER_TEST_IDS } from '../components/Money/RewardsHeldBanner.testIds';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from '../components/Money/RewardsPausedBanner.testIds';
import {
  renderCopyTradingView,
  renderMoneyReferralsView,
} from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  REFERRAL_LOCALIZED_TEXT,
  TAX_HELD_EARNINGS_SUMMARY,
} from '../../../../../tests/component-view/presets/rewardsMoney';

describe('earn destination pages', () => {
  it('shows the tax-held banner on the family it belongs to and opens the held sheet', async () => {
    const { findByTestId, findByText, getByTestId, queryByTestId } =
      renderCopyTradingView({
        persona: 'referee',
        summary: TAX_HELD_EARNINGS_SUMMARY,
      });

    const banner = await findByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER);

    expect(
      within(banner).getByText(
        REFERRAL_LOCALIZED_TEXT.rewardsHeldBanner.replace(
          '{heldAmount}',
          '$9.15',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      within(banner).getByText(REFERRAL_LOCALIZED_TEXT.rewardsHeldLearnMore),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER));

    expect(
      await findByText(REFERRAL_LOCALIZED_TEXT.rewardsHeldTitle),
    ).toBeOnTheScreen();
    expect(
      await findByText(REFERRAL_LOCALIZED_TEXT.rewardsHeldDescription),
    ).toBeOnTheScreen();
  });

  it('keeps the held banner off a family the hold does not belong to', async () => {
    const { findAllByText, getByTestId, queryByTestId } =
      renderMoneyReferralsView({
        persona: 'referrer',
        summary: TAX_HELD_EARNINGS_SUMMARY,
      });

    // The family breakdown shows a dash until the summary arrives, so a zero
    // amount means the summary has been read.
    expect((await findAllByText('$0.00')).length).toBeGreaterThan(0);

    expect(
      getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER),
    ).not.toBeOnTheScreen();
  });
});
