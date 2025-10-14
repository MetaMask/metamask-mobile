import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import UnmountOnBlur from '../../../Views/UnmountOnBlur';
import Routes from '../../../../constants/navigation/Routes';

const Stack = createStackNavigator();
const onboardingDefaultNavigationOptions = {
  headerShown: false,
};

const OnboardingNavigator: React.FC = () => (
  <UnmountOnBlur>
    <Stack.Navigator
      initialRouteName={Routes.CARD.ONBOARDING.SIGN_UP}
      headerMode="screen"
    >
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.SIGN_UP}
        component={OnboardingSignUp}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_EMAIL}
        component={OnboardingConfirmEmail}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.SET_PHONE_NUMBER}
        component={OnboardingSetPhoneNumber}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER}
        component={OnboardingConfirmPhoneNumber}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VERIFY_IDENTITY}
        component={OnboardingVerifyIdentity}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VALIDATING_KYC}
        component={OnboardingValidatingKyc}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PERSONAL_DETAILS}
        component={OnboardingPersonalDetails}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS}
        component={OnboardingPhysicalAddress}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.MAILING_ADDRESS}
        component={OnboardingMailingAddress}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.COMPLETE}
        component={OnboardingComplete}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.FAILED}
        component={OnboardingFailed}
        options={onboardingDefaultNavigationOptions}
      />
    </Stack.Navigator>
  </UnmountOnBlur>
);

export default OnboardingNavigator;
