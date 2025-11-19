import React, { useCallback } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
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
import VerifyingRegistration from '../components/Onboarding/VerifyingRegistration';
import Complete from '../components/Onboarding/Complete';
import { cardAuthenticationNavigationOptions, headerStyle } from '.';
import { selectOnboardingId } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import KYCWebview from '../components/Onboarding/KYCWebview';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
const Stack = createStackNavigator();

export const KYCModalNavigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}): StackNavigationOptions => {
  const handleClosePress = () => {
    Alert.alert(
      strings('card.card_onboarding.kyc_webview.close_confirmation_title'),
      strings('card.card_onboarding.kyc_webview.close_confirmation_message'),
      [
        {
          text: strings('card.card_onboarding.kyc_webview.cancel_button'),
          style: 'cancel',
        },
        {
          text: strings('card.card_onboarding.kyc_webview.close_button'),
          onPress: () =>
            navigation.navigate(Routes.CARD.ONBOARDING.VALIDATING_KYC),
          style: 'destructive',
        },
      ],
    );
  };

  return {
    headerLeft: () => <View />,
    headerTitle: () => (
      <Text
        variant={TextVariant.HeadingSM}
        style={headerStyle.title}
        testID={'card-view-title'}
      >
        {strings('card.card')}
      </Text>
    ),
    headerRight: () => (
      <ButtonIcon
        style={headerStyle.icon}
        size={ButtonIconSizes.Lg}
        iconName={IconName.Close}
        testID="close-button"
        onPress={handleClosePress}
      />
    ),
  };
};

const ValidatingKYCNavigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}): StackNavigationOptions => ({
  headerLeft: () => (
    <ButtonIcon
      style={headerStyle.icon}
      size={ButtonIconSizes.Md}
      iconName={IconName.ArrowLeft}
      testID="back-button"
      onPress={() =>
        navigation.navigate(Routes.CARD.ONBOARDING.VERIFY_IDENTITY)
      }
    />
  ),
  headerTitle: () => (
    <Text
      variant={TextVariant.HeadingSM}
      style={headerStyle.title}
      testID={'card-view-title'}
    >
      {strings('card.card')}
    </Text>
  ),
  headerRight: () => <View />,
});

const OnboardingNavigator: React.FC = () => {
  const onboardingId = useSelector(selectOnboardingId);
  const { user, isLoading } = useCardSDK();

  const getInitialRouteName = useCallback(() => {
    if (!onboardingId || !user?.id) {
      return Routes.CARD.ONBOARDING.SIGN_UP;
    }
    if (user?.verificationState === 'PENDING') {
      return Routes.CARD.ONBOARDING.VALIDATING_KYC;
    }
    if (user?.verificationState === 'VERIFIED') {
      if (!user?.firstName || !user?.countryOfNationality) {
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
  }, [onboardingId, user]);

  // Show loading indicator while SDK is initializing or user data is being fetched
  if (isLoading) {
    return (
      <Box twClassName="flex-1 items-center justify-center">
        <ActivityIndicator testID="activity-indicator" />
      </Box>
    );
  }

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
        options={ValidatingKYCNavigationOptions}
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
        name={Routes.CARD.ONBOARDING.VERIFYING_REGISTRATION}
        component={VerifyingRegistration}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.COMPLETE}
        component={Complete}
        options={cardAuthenticationNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.WEBVIEW}
        component={KYCWebview}
        options={KYCModalNavigationOptions}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
