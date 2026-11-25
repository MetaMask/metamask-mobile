/**
 * The accepted-referral splash's exits across navigation stacks.
 *
 * B12: View rewards resets to the Money dashboard above Wallet and drops the
 * pre-accept view from the stack, so Back afterwards leaves Rewards for
 * Wallet instead of returning to the pre-accept view. Covered with and
 * without a pre-accept Rewards view beneath the splash (both nav variants).
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyReferralAcceptedSplashView.stack.view.test.tsx --runInBand --coverage=false
 */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import '../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import RewardsMoneyReferralAcceptedSplashView, {
  REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS as SPLASH_TEST_IDS,
} from './RewardsMoneyReferralAcceptedSplashView';
import {
  getRouteProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
import { rewardsMoneyViewState } from '../../../../../tests/component-view/presets/rewardsMoney';

const PRE_ACCEPT_ROUTE = 'PreAcceptMoneyDashboard';
const SPLASH_ROUTE = Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW;
const REWARDS_VIEW_PROBE = getRouteProbeTestId(Routes.REWARDS_VIEW);

const PRE_ACCEPT_PROBE = getRouteProbeTestId(PRE_ACCEPT_ROUTE);

/** Navigates to `to` on mount, so a journey starts from the desired shape. */
function AutoNavigate({ to, marker }: { to: string; marker: string }) {
  const navigation = useNavigation();
  React.useEffect(() => {
    navigation.navigate(to as never);
  }, [navigation, to]);
  return <Text testID={marker}>{marker}</Text>;
}

/** Journeys start here: the entry immediately pushes the Wallet tab. */
function SplashJourneyEntry() {
  return <AutoNavigate to={Routes.HOME_TABS} marker="splash-journey-entry" />;
}

/** A stack screen that pushes `to` when pressed. */
function PushScreen({ to, marker }: { to: string; marker: string }) {
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      testID={marker}
      onPress={() => navigation.navigate(to as never)}
    >
      <Text>{marker}</Text>
    </Pressable>
  );
}

/** Wallet tab screens: one opens the pre-accept Rewards view, one the splash. */
function HomeOpeningPreAccept() {
  return <PushScreen to={PRE_ACCEPT_ROUTE} marker="home-open-rewards" />;
}

function HomeOpeningSplash() {
  return <PushScreen to={SPLASH_ROUTE} marker="home-open-rewards" />;
}

/** The pre-accept Money dashboard beneath the splash. */
function PreAcceptScreen() {
  return <PushScreen to={SPLASH_ROUTE} marker="pre-accept-open-splash" />;
}

/** The Money dashboard the reset lands on, with a Back control. */
function RewardsViewWithBack() {
  const navigation = useNavigation();
  return (
    <>
      <Text testID={REWARDS_VIEW_PROBE}>{Routes.REWARDS_VIEW}</Text>
      <Pressable
        accessibilityRole="button"
        testID="rewards-view-back"
        onPress={() => navigation.goBack()}
      >
        <Text>Back</Text>
      </Pressable>
    </>
  );
}

function renderSplashStack({
  withPreAcceptRewards,
}: {
  withPreAcceptRewards: boolean;
}) {
  const state = rewardsMoneyViewState({
    persona: 'referee',
    pendingReferralCode: 'KOL1',
  });
  return renderScreenWithRoutes(
    SplashJourneyEntry,
    { name: 'SplashJourneyEntry' },
    [
      {
        name: Routes.HOME_TABS,
        Component: withPreAcceptRewards
          ? HomeOpeningPreAccept
          : HomeOpeningSplash,
      },
      ...(withPreAcceptRewards
        ? [{ name: PRE_ACCEPT_ROUTE, Component: PreAcceptScreen }]
        : []),
      {
        name: SPLASH_ROUTE,
        Component:
          RewardsMoneyReferralAcceptedSplashView as unknown as React.ComponentType,
      },
      { name: Routes.REWARDS_VIEW, Component: RewardsViewWithBack },
    ],
    { state },
  );
}

async function openSplash(
  view: ReturnType<typeof renderSplashStack>,
  { viaPreAccept }: { viaPreAccept: boolean },
): Promise<void> {
  fireEvent.press(await view.findByTestId('home-open-rewards'));
  if (viaPreAccept) {
    fireEvent.press(await view.findByTestId('pre-accept-open-splash'));
  }
  await view.findByTestId(SPLASH_TEST_IDS.CONTAINER);
}

describe('RewardsMoneyReferralAcceptedSplashView stack', () => {
  it('drops the pre-accept view and lands Back on Wallet (B12, pre-accept variant)', async () => {
    const view = renderSplashStack({ withPreAcceptRewards: true });
    await openSplash(view, { viaPreAccept: true });

    fireEvent.press(
      view.getByTestId('rewards-money-referral-accepted-view-rewards'),
    );

    // The reset landed on the Money dashboard above Wallet, the splash is
    // gone, and the pre-accept view was dropped from the stack.
    expect(await view.findByTestId(REWARDS_VIEW_PROBE)).toBeOnTheScreen();
    expect(view.queryByTestId(SPLASH_TEST_IDS.CONTAINER)).not.toBeOnTheScreen();
    expect(view.queryByTestId(PRE_ACCEPT_PROBE)).not.toBeOnTheScreen();

    // Back leaves Rewards: Wallet is underneath, and neither the pre-accept
    // view nor the splash comes back.
    fireEvent.press(view.getByTestId('rewards-view-back'));
    expect(view.getByTestId('home-open-rewards')).toBeOnTheScreen();
    expect(view.queryByTestId(REWARDS_VIEW_PROBE)).not.toBeOnTheScreen();
    expect(view.queryByTestId(PRE_ACCEPT_PROBE)).not.toBeOnTheScreen();
    expect(view.queryByTestId(SPLASH_TEST_IDS.CONTAINER)).not.toBeOnTheScreen();
  });

  it('lands View rewards on the Money dashboard without a pre-accept view (B12, no Rewards beneath)', async () => {
    const view = renderSplashStack({ withPreAcceptRewards: false });
    await openSplash(view, { viaPreAccept: false });

    fireEvent.press(
      view.getByTestId('rewards-money-referral-accepted-view-rewards'),
    );

    expect(await view.findByTestId(REWARDS_VIEW_PROBE)).toBeOnTheScreen();
    expect(view.queryByTestId(SPLASH_TEST_IDS.CONTAINER)).not.toBeOnTheScreen();
  });
});
