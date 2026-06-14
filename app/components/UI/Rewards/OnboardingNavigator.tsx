import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import OnboardingMainStep from './components/Onboarding/OnboardingMainStep';
import UnmountOnBlur from '../../Views/UnmountOnBlur';

const Stack = createStackNavigator();

const OnboardingNavigator: React.FC = () => (
  <UnmountOnBlur>
    <Stack.Navigator initialRouteName={Routes.REWARDS_ONBOARDING_INTRO}>
      <Stack.Screen
        name={Routes.REWARDS_ONBOARDING_INTRO}
        component={OnboardingMainStep}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  </UnmountOnBlur>
);

export default OnboardingNavigator;
