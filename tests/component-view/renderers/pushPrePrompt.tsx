import '../mocks';
import React from 'react';
import {
  createNavigationContainerRef,
  NavigationContainer,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../app/util/test/renderWithProvider';
import NavigationService from '../../../app/core/NavigationService';
import Routes from '../../../app/constants/navigation/Routes';
import PushNotificationOnboardingRoot from '../../../app/components/Views/Notifications/PushNotificationOnboarding/PushNotificationOnboardingRoot';
import { buildNotificationsState } from '../presets/notifications';
import { createStateFixture } from '../stateFixture';

const Root = createNativeStackNavigator();
const Main = createNativeStackNavigator();
const Wallet = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

export const PUSH_PRE_PROMPT_NAV_TEST_IDS = {
  HOME: 'push-pre-prompt-home',
  COVER: 'push-pre-prompt-cover',
} as const;

const Home = () => <Text testID={PUSH_PRE_PROMPT_NAV_TEST_IDS.HOME}>Home</Text>;
const Cover = () => (
  <Text testID={PUSH_PRE_PROMPT_NAV_TEST_IDS.COVER}>Cover</Text>
);
const WalletStack = () => (
  <Wallet.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
    <Wallet.Screen name={Routes.WALLET_VIEW} component={Home} />
  </Wallet.Navigator>
);
const HomeTabs = () => (
  <Tabs.Navigator screenOptions={{ headerShown: false }}>
    <Tabs.Screen name={Routes.WALLET.HOME} component={WalletStack} />
  </Tabs.Navigator>
);
const MainFlow = () => (
  <>
    <Main.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      <Main.Screen name={Routes.HOME_TABS} component={HomeTabs} />
      <Main.Screen name={Routes.REWARDS_VIEW} component={Cover} />
    </Main.Navigator>
    <PushNotificationOnboardingRoot />
  </>
);

/**
 * This presenter is global and reads the hydrated root tree. A flat probe
 * stack cannot exercise its contract, so reproduce the actual HomeNav -> Home
 * -> tab -> WalletView boundaries, with real navigation and Redux eligibility.
 */
export function renderPushPrePrompt(completedOnboarding = true) {
  const navigation = createNavigationContainerRef<ParamListBase>();
  NavigationService.navigation = navigation;
  const state = createStateFixture()
    .withMinimalAccounts()
    .withMinimalAnalyticsController()
    .withOverrides(buildNotificationsState())
    .withRemoteFeatureFlags({
      assetsNotificationsEnabled: true,
      assetsEnableNotificationsByDefault: true,
      prePushPromptEnabled: { enabled: true, minimumVersion: '0.0.0' },
    })
    .withOverrides({ onboarding: { completedOnboarding } })
    .build();

  return {
    ...renderWithProvider(
      <NavigationContainer ref={navigation}>
        <Root.Navigator
          screenOptions={{ headerShown: false, animation: 'none' }}
        >
          <Root.Screen name={Routes.ONBOARDING.HOME_NAV} component={MainFlow} />
        </Root.Navigator>
      </NavigationContainer>,
      { state },
      false,
    ),
    navigation,
  };
}
