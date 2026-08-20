import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../constants/navigation/Routes';
import OnboardingMainStep from './components/Onboarding/OnboardingMainStep';
import UnmountOnBlur from '../../Views/UnmountOnBlur';

const Stack = createNativeStackNavigator();

const OnboardingNavigator: React.FC = () => (
  <UnmountOnBlur>
    <Stack.Navigator
      initialRouteName={Routes.REWARDS_ONBOARDING_INTRO}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name={Routes.REWARDS_ONBOARDING_INTRO}
        component={OnboardingMainStep}
      />
    </Stack.Navigator>
  </UnmountOnBlur>
);

export default OnboardingNavigator;
