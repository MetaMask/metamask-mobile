import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import OnboardingIntroStep from './components/Onboarding/OnboardingIntroStep';
import UnmountOnBlur from '../../Views/UnmountOnBlur';

const Stack = createStackNavigator();

const OnboardingNavigator: React.FC = () => (
  <UnmountOnBlur>
    <Stack.Navigator initialRouteName={Routes.REWARDS_ONBOARDING_INTRO}>
      <Stack.Screen
        name={Routes.REWARDS_ONBOARDING_INTRO}
        component={OnboardingIntroStep}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  </UnmountOnBlur>
);

export default OnboardingNavigator;
