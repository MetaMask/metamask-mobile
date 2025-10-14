import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import UnmountOnBlur from '../../../Views/UnmountOnBlur';
import Routes from '../../../../constants/navigation/Routes';
import SignUp from '../components/Onboarding/SignUp';
import ConfirmEmail from '../components/Onboarding/ConfirmEmail';
import SetPhoneNumber from '../components/Onboarding/SetPhoneNumber';
import ConfirmPhoneNumber from '../components/Onboarding/ConfirmPhoneNumber';
import VerifyIdentity from '../components/Onboarding/VerifyIdentity';
import ValidatingKYC from '../components/Onboarding/ValidatingKYC';

// TODO: Import other onboarding components when they are created
const OnboardingPersonalDetails = () => null;
const OnboardingPhysicalAddress = () => null;
const OnboardingMailingAddress = () => null;
const OnboardingComplete = () => null;
const OnboardingFailed = () => null;

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
        component={SignUp}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_EMAIL}
        component={ConfirmEmail}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.SET_PHONE_NUMBER}
        component={SetPhoneNumber}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER}
        component={ConfirmPhoneNumber}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VERIFY_IDENTITY}
        component={VerifyIdentity}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VALIDATING_KYC}
        component={ValidatingKYC}
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
