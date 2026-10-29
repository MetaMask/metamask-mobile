/**
 * Rewards Money dashboard through the shared preset.
 *
 * Absorbs the earnings-history journey from #37974.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyDashboard.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from './RewardsMoneyDashboard.testIds';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../components/Money/ClaimableRewardsCard.testIds';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows.testIds';
import { EARNINGS_TAB_TEST_IDS } from '../components/Money/Tabs/EarningsTab.testIds';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { renderRewardsMoneyDashboard } from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  EARNINGS_HISTORY_ROW,
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
