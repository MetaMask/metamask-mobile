import React, { useEffect, useMemo, useState } from 'react';
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
import { cardDefaultNavigationOptions, headerStyle } from '.';
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
import { useParams } from '../../../../util/navigation/navUtils';
import { CardUserPhase } from '../types';
import Complete from '../components/Onboarding/Complete';

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
            navigation.navigate(Routes.CARD.ONBOARDING.PERSONAL_DETAILS),
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

export const PersonalDetailsNavigationOptions = ({
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
  headerTitle: () => <View />,
  headerRight: () => <View />,
});

const OnboardingNavigator: React.FC = () => {
  const { cardUserPhase } = useParams<{
    cardUserPhase?: CardUserPhase;
  }>();
  const onboardingId = useSelector(selectOnboardingId);
  const { user, isLoading, fetchUserData } = useCardSDK();
  const [isMounted, setIsMounted] = useState(false);

  // Fetch fresh user data on mount if user data is missing
  // This ensures we always have the most up-to-date onboarding information
  // when the navigator is accessed
  useEffect(() => {
    if (!isMounted && onboardingId && !user) {
      fetchUserData();
    }
    setIsMounted(true);
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const getInitialRouteName = useMemo(() => {
    // Priority 1: Use cardUserPhase if provided (from login response)
    if (cardUserPhase) {
      if (cardUserPhase === 'ACCOUNT' || !user?.contactVerificationId) {
        return Routes.CARD.ONBOARDING.SIGN_UP;
      }
      if (cardUserPhase === 'PHONE_NUMBER') {
        return Routes.CARD.ONBOARDING.SET_PHONE_NUMBER;
      }
      if (cardUserPhase === 'PERSONAL_INFORMATION') {
        return Routes.CARD.ONBOARDING.PERSONAL_DETAILS;
      }
      if (cardUserPhase === 'PHYSICAL_ADDRESS') {
        return Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS;
      }
      if (cardUserPhase === 'MAILING_ADDRESS') {
        return Routes.CARD.ONBOARDING.MAILING_ADDRESS;
      }
    }

    // Priority 2: Use cached user data if available
    if (user?.verificationState && onboardingId) {
      if (user.verificationState === 'UNVERIFIED') {
        return Routes.CARD.ONBOARDING.SIGN_UP;
      }

      if (user.verificationState === 'PENDING') {
        if (!user?.phoneNumber) {
          return Routes.CARD.ONBOARDING.SET_PHONE_NUMBER;
        }

        if (
          !user.firstName ||
          !user.lastName ||
          !user.countryOfNationality ||
          !user.dateOfBirth
        ) {
          return Routes.CARD.ONBOARDING.PERSONAL_DETAILS;
        }

        if (!user?.addressLine1 || !user?.city || !user?.zip) {
          return Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS;
        }

        return Routes.CARD.ONBOARDING.VERIFY_IDENTITY;
      }

      if (user.verificationState === 'VERIFIED') {
        return Routes.CARD.ONBOARDING.COMPLETE;
      }
    }

    // Default to SIGN_UP route if no user data is available
    return Routes.CARD.ONBOARDING.SIGN_UP;
  }, [user, cardUserPhase, onboardingId]);

  if (isLoading && !user) {
    return (
      <Box twClassName="flex-1 items-center justify-center">
        <ActivityIndicator testID="activity-indicator" size="large" />
      </Box>
    );
  }

  return (
    <Stack.Navigator initialRouteName={getInitialRouteName}>
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.SIGN_UP}
        component={SignUp}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_EMAIL}
        component={ConfirmEmail}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.SET_PHONE_NUMBER}
        component={SetPhoneNumber}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER}
        component={ConfirmPhoneNumber}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VERIFY_IDENTITY}
        component={VerifyIdentity}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VALIDATING_KYC}
        component={ValidatingKYC}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.COMPLETE}
        component={Complete}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.KYC_FAILED}
        component={KYCFailed}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PERSONAL_DETAILS}
        component={PersonalDetails}
        options={PersonalDetailsNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS}
        component={PhysicalAddress}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.MAILING_ADDRESS}
        component={MailingAddress}
        options={cardDefaultNavigationOptions}
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
