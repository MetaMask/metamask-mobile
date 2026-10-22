/**
 * Earnings dashboard through the real summary and history hooks.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyDashboard.view.test.tsx --runInBand --silent --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, within } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import {
  getRouteProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  EARNINGS_HISTORY_ROW,
  installRewardsMoneyReads,
  rewardsMoneyViewState,
} from '../../../../../tests/component-view/presets/rewardsMoney';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../components/Money/ClaimableRewardsCard';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows';
import { EARNINGS_TAB_TEST_IDS } from '../components/Money/Tabs/EarningsTab';
import RewardsMoneyDashboard, {
  REWARDS_MONEY_DASHBOARD_TEST_IDS,
} from './RewardsMoneyDashboard';

const HistoryStack = createNativeStackNavigator();

const HistoryRouteProbe = () => (
  <Text testID={getRouteProbeTestId(Routes.REWARDS_EARNINGS_HISTORY_VIEW)}>
    {Routes.REWARDS_EARNINGS_HISTORY_VIEW}
  </Text>
);

/** History lives on the rewards flow, which the dashboard navigates into. */
function RewardsHistoryFlow() {
  return (
    <HistoryStack.Navigator>
      <HistoryStack.Screen
        name={Routes.REWARDS_EARNINGS_HISTORY_VIEW}
        component={HistoryRouteProbe}
      />
    </HistoryStack.Navigator>
  );
}

function renderDashboard() {
  installRewardsMoneyReads(CLAIMABLE_EARNINGS_SUMMARY, [EARNINGS_HISTORY_ROW]);
  const state = rewardsMoneyViewState(CLAIMABLE_EARNINGS_SUMMARY);
  return renderScreenWithRoutes(
    RewardsMoneyDashboard as unknown as React.ComponentType,
    { name: Routes.REWARDS_MONEY_DASHBOARD },
    [{ name: Routes.REWARDS_FLOW, Component: RewardsHistoryFlow }],
    { state },
  );
}

describe('RewardsMoneyDashboard earnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the claimable indicator and opens the full earnings history', async () => {
    const { findByTestId, getByTestId } = renderDashboard();

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
    expect(within(historyRow).getByText('Rebate')).toBeOnTheScreen();
    expect(within(historyRow).getByText('+$1.00')).toBeOnTheScreen();

    fireEvent.press(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_HEADER));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_EARNINGS_HISTORY_VIEW),
      ),
    ).toBeOnTheScreen();
  });
});
