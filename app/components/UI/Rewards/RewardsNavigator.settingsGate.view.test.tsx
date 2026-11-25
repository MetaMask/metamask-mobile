/**
 * The Rewards flow's Settings gate.
 *
 * B23: Settings stays open for an unsubscribed plain profile with a cached
 * referral payload, and closes when that payload disappears (account switch)
 * while the screen is open.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/RewardsNavigator.settingsGate.view.test.tsx --runInBand --coverage=false
 */
import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import '../../../../tests/component-view/mocks';
import { act } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import RewardsNavigator from './RewardsNavigator';
import { setReferralMe } from '../../../reducers/rewardsMoney';
import { renderScreenWithRoutes } from '../../../../tests/component-view/render';
import { installRewardsMoneyEngine } from '../../../../tests/component-view/renderers/rewardsMoney';
import {
  referralMeFixture,
  REWARDS_MONEY_PROFILE_ID,
  rewardsMoneyViewState,
} from '../../../../tests/component-view/presets/rewardsMoney';
import { REFERRED_BY_CODE_SECTION_TEST_IDS } from './components/Settings/ReferredByCodeSection.testIds';
import { REWARDS_SETTINGS_SAFE_AREA_TEST_ID } from './Views/RewardsSettingsView';

/** Opens the Money flow on Settings, the way the Money dashboard gear does. */
function SettingsGateJourneyHost() {
  const navigation = useNavigation();
  React.useEffect(() => {
    navigation.navigate(Routes.REWARDS_FLOW as never, {
      screen: Routes.REWARDS_SETTINGS_VIEW,
    });
  }, [navigation]);
  return <Text testID="settings-gate-host">Host</Text>;
}

describe('RewardsNavigator settings gate', () => {
  it('keeps Settings open for a cached referral and closes it when the payload is gone (B23)', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('plain'),
      handlers: {
        'AuthenticationController:getSessionProfile': () =>
          Promise.resolve({ profileId: REWARDS_MONEY_PROFILE_ID }),
        'RewardsMoneyController:canChangeRewardsMoneyEnvUrl': () => false,
        'RewardsMoneyController:getRewardsMoneyEnvUrl': () =>
          'https://rewards-money.dev-api.cx.metamask.io',
      },
    });
    const state = rewardsMoneyViewState({
      persona: 'plain',
      moneyControllerEnabled: true,
      subscriptionId: null,
    });
    const { findByTestId, queryByTestId, getByTestId, store } =
      renderScreenWithRoutes(
        SettingsGateJourneyHost,
        { name: 'SettingsGateJourneyHost' },
        [
          {
            name: Routes.REWARDS_FLOW,
            Component: RewardsNavigator as unknown as React.ComponentType,
          },
        ],
        { state },
      );

    // The gate holds: flag on, plain profile, allowed geo, cached payload.
    expect(
      await findByTestId(REWARDS_SETTINGS_SAFE_AREA_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.SECTION),
    ).toBeOnTheScreen();

    // An account switch drops the cached payload for the session profile.
    await act(async () => {
      store.dispatch(
        setReferralMe({ profileId: REWARDS_MONEY_PROFILE_ID, data: null }),
      );
    });

    // The flow dismisses itself: Settings and the referral section unmount.
    expect(
      queryByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.SECTION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_SETTINGS_SAFE_AREA_TEST_ID),
    ).not.toBeOnTheScreen();
    expect(getByTestId('settings-gate-host')).toBeOnTheScreen();
  });
});
