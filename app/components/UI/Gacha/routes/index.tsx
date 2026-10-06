import React from 'react';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../../constants/navigation/Routes';
import { fullScreenModalSlideFromBottomNativeOptions } from '../../../../constants/navigation/clearStackNavigatorOptions';
import type { GachaStackParamList } from '../types/navigation';
import GachaHome from '../views/GachaHome';
import GachaReveal from '../views/GachaReveal';
import GachaCard from '../views/GachaCard';
import GachaOnboardingScreen from '../views/GachaOnboarding/GachaOnboardingScreen';
import { selectGachaHasCompletedOnboarding } from '../selectors/onboarding';

const Stack = createNativeStackNavigator<GachaStackParamList>();

const REVEAL_OPTIONS = {
  ...fullScreenModalSlideFromBottomNativeOptions,
  // Only explicit buttons can leave the reveal, including its local demo.
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
};

/** Completing onboarding replaces its route with Packs, without retaining it in history. */
const GachaScreenStack = () => {
  const hasCompletedOnboarding = useSelector(selectGachaHasCompletedOnboarding);
  return (
    <Stack.Navigator
      initialRouteName={
        hasCompletedOnboarding ? Routes.GACHA.HOME : Routes.GACHA.ONBOARDING
      }
      screenOptions={{ headerShown: false }}
    >
      {hasCompletedOnboarding ? (
        <>
          <Stack.Screen name={Routes.GACHA.HOME} component={GachaHome} />
          <Stack.Screen
            name={Routes.GACHA.REVEAL}
            component={GachaReveal}
            options={REVEAL_OPTIONS}
          />
          <Stack.Screen name={Routes.GACHA.CARD} component={GachaCard} />
        </>
      ) : (
        <Stack.Screen
          name={Routes.GACHA.ONBOARDING}
          component={GachaOnboardingScreen}
        />
      )}
    </Stack.Navigator>
  );
};

export default GachaScreenStack;
