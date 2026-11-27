/**
 * The claim indicator on the Rewards Money dashboard.
 *
 * E1: a claimable referee sees the green dot, the amount, and an enabled
 * Claim button.
 * F7: a referrer with cashback at the minimum sees the dot and can claim.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyDashboard.claimIndicator.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from './RewardsMoneyDashboard.testIds';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../components/Money/ClaimableRewardsCard.testIds';
import { renderRewardsMoneyDashboard } from '../../../../../tests/component-view/renderers/rewardsMoney';
import { EXACT_DOLLAR_EARNINGS_SUMMARY } from '../../../../../tests/component-view/presets/rewardsMoney';

describe('RewardsMoneyDashboard claim indicator', () => {
  it('shows the dot, the amount, and an enabled Claim for a claimable referee (E1)', async () => {
    const { getByTestId, findByTestId, engine } = renderRewardsMoneyDashboard({
      persona: 'referee',
      summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
      claimReady: true,
      initiateClaim: 'hang',
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
    ).toBeOnTheScreen();
    const claimButton = await findByTestId(
      CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON,
    );
    expect(claimButton).toBeEnabled();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$1.00');

    // The dashboard re-renders while its reads settle, so re-query the button
    // instead of pressing the awaited node.
    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));

    await waitFor(() => {
      expect(
        engine.mock.calls.filter(
          (call) => call[0] === 'RewardsMoneyController:initiateClaim',
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  it('marks the tab with the dot for a referrer with claimable cashback (F7)', async () => {
    const { getByTestId, findByTestId } = renderRewardsMoneyDashboard({
      persona: 'referrer',
      summary: EXACT_DOLLAR_EARNINGS_SUMMARY,
    });

    expect(
      getByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.WAYS_TO_EARN_TAB_DOT),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$1.00');
  });
});
