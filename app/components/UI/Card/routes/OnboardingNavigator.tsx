import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
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
import { cardAuthenticationNavigationOptions } from '.';
import { selectOnboardingId } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';

const Stack = createStackNavigator();

const OnboardingNavigator: React.FC = () => {
  const onboardingId = useSelector(selectOnboardingId);
  const { user } = useCardSDK();

  const getInitialRouteName = () => {
    if (!onboardingId || !user?.id) {
      return Routes.CARD.ONBOARDING.SIGN_UP;
    }
    if (user?.verificationState === 'PENDING') {
      return Routes.CARD.ONBOARDING.VALIDATING_KYC;
    }
    if (user?.verificationState === 'VERIFIED') {
      if (!user?.firstName) {
        return Routes.CARD.ONBOARDING.PERSONAL_DETAILS;
      } else if (!user?.addressLine1) {
        return Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS;
      }
      return Routes.CARD.ONBOARDING.COMPLETE;
    }
    if (onboardingId) {
      return Routes.CARD.ONBOARDING.SET_PHONE_NUMBER;
    }
    return Routes.CARD.ONBOARDING.VERIFY_IDENTITY;
  };

  return (
    <Stack.Navigator initialRouteName={getInitialRouteName()}>
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.SIGN_UP}
        component={SignUp}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_EMAIL}
        component={ConfirmEmail}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.SET_PHONE_NUMBER}
        component={SetPhoneNumber}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER}
        component={ConfirmPhoneNumber}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VERIFY_IDENTITY}
        component={VerifyIdentity}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VALIDATING_KYC}
        component={ValidatingKYC}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.KYC_FAILED}
        component={KYCFailed}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PERSONAL_DETAILS}
        component={PersonalDetails}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS}
        component={PhysicalAddress}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.MAILING_ADDRESS}
        component={MailingAddress}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.COMPLETE}
        component={Complete}
        options={cardAuthenticationNavigationOptions}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
