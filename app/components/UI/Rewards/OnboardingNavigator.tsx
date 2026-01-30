import React, { useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import Routes from '../../../constants/navigation/Routes';
import { OnboardingStep } from '../../../reducers/rewards/types';
import { selectOnboardingActiveStep } from '../../../reducers/rewards/selectors';
import OnboardingIntroStep from './components/Onboarding/OnboardingIntroStep';
import OnboardingStep1 from './components/Onboarding/OnboardingStep1';
import OnboardingStep2 from './components/Onboarding/OnboardingStep2';
import OnboardingStep3 from './components/Onboarding/OnboardingStep3';
import OnboardingStep4 from './components/Onboarding/OnboardingStep4';
import UnmountOnBlur from '../../Views/UnmountOnBlur';
import { strings } from '../../../../locales/i18n';

const Stack = createStackNavigator();

const OnboardingNavigator: React.FC = () => {
  const activeStep = useSelector(selectOnboardingActiveStep);

  const getInitialRoute = useCallback(() => {
    switch (activeStep) {
      case OnboardingStep.INTRO_MODAL:
      case OnboardingStep.INTRO:
        return Routes.REWARDS_ONBOARDING_INTRO;
      case OnboardingStep.STEP_1:
        return Routes.REWARDS_ONBOARDING_1;
      case OnboardingStep.STEP_2:
        return Routes.REWARDS_ONBOARDING_2;
      case OnboardingStep.STEP_3:
        return Routes.REWARDS_ONBOARDING_3;
      case OnboardingStep.STEP_4:
        return Routes.REWARDS_ONBOARDING_4;
      default:
        return Routes.REWARDS_ONBOARDING_INTRO;
    }
  }, [activeStep]);

  return (
    <UnmountOnBlur>
      <Stack.Navigator initialRouteName={getInitialRoute()}>
        <Stack.Screen
          name={Routes.REWARDS_ONBOARDING_INTRO}
          options={{ headerShown: false }}
        >
          {() => (
            <OnboardingIntroStep
              title={strings('rewards.onboarding.intro_title')}
              description={strings('rewards.onboarding.intro_description')}
              confirmLabel={strings('rewards.onboarding.intro_confirm')}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name={Routes.REWARDS_ONBOARDING_1}
          component={OnboardingStep1}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.REWARDS_ONBOARDING_2}
          component={OnboardingStep2}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.REWARDS_ONBOARDING_3}
          component={OnboardingStep3}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.REWARDS_ONBOARDING_4}
          component={OnboardingStep4}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </UnmountOnBlur>
  );
};

export default OnboardingNavigator;
