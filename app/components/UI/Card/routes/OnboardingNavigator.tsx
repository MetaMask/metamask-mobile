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
import KYCFailed from '../components/Onboarding/KYCFailed';
import PersonalDetails from '../components/Onboarding/PersonalDetails';
import PhysicalAddress from '../components/Onboarding/PhysicalAddress';
import MailingAddress from '../components/Onboarding/MailingAddress';
import Complete from '../components/Onboarding/Complete';

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
        name={Routes.CARD.ONBOARDING.KYC_FAILED}
        component={KYCFailed}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PERSONAL_DETAILS}
        component={PersonalDetails}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS}
        component={PhysicalAddress}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.MAILING_ADDRESS}
        component={MailingAddress}
        options={onboardingDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.COMPLETE}
        component={Complete}
        options={onboardingDefaultNavigationOptions}
      />
    </Stack.Navigator>
  </UnmountOnBlur>
);

export default OnboardingNavigator;
