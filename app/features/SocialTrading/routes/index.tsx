import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { SocialTradingProvider } from '../context/SocialTradingContext';
import SocialTradingView from '../components/views/SocialTradingView/SocialTradingView';
import SocialTraderProfile from '../components/views/SocialTraderProfile/SocialTraderProfile';

const Stack = createNativeStackNavigator();

/**
 * Feature-local stack for the Social Trading prototype. The provider is
 * mounted here so simulated state lives and dies with the flow.
 */
export function SocialTradingScreenStack() {
  return (
    <SocialTradingProvider>
      <Stack.Navigator>
        <Stack.Screen
          name={Routes.SOCIAL_TRADING.HOME}
          component={SocialTradingView}
          options={{ title: strings('social_trading.title') }}
        />
        <Stack.Screen
          name={Routes.SOCIAL_TRADING.TRADER_PROFILE}
          component={SocialTraderProfile}
          options={{ title: strings('social_trading.profile.title') }}
        />
      </Stack.Navigator>
    </SocialTradingProvider>
  );
}

export default SocialTradingScreenStack;
