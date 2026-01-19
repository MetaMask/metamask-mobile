import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import VerifyingVeriffKYC from '../components/Onboarding/VerifyingVeriffKYC';
import KYCFailed from '../components/Onboarding/KYCFailed';
import PersonalDetails from '../components/Onboarding/PersonalDetails';
import PhysicalAddress from '../components/Onboarding/PhysicalAddress';
import { cardDefaultNavigationOptions, headerStyle } from '.';
import { selectOnboardingId } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import KYCWebview from '../components/Onboarding/KYCWebview';
import { useNavigation, StackActions } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useParams } from '../../../../util/navigation/navUtils';
import { CardUserPhase } from '../types';
import Complete from '../components/Onboarding/Complete';

const Stack = createStackNavigator();

export const PostEmailNavigationOptions = ({
  navigation,
}: {
  navigation: {
    dispatch: (action: ReturnType<typeof StackActions.popToTop>) => void;
  };
}): StackNavigationOptions => {
  const handleClosePress = () => {
    Alert.alert(
      strings('card.card_onboarding.exit_confirmation.title'),
      strings('card.card_onboarding.exit_confirmation.message'),
      [
        {
          text: strings('card.card_onboarding.exit_confirmation.cancel_button'),
          style: 'cancel',
        },
        {
          text: strings('card.card_onboarding.exit_confirmation.exit_button'),
          onPress: () => navigation.dispatch(StackActions.popToTop()),
          style: 'destructive',
        },
      ],
    );
  };

  return {
    headerLeft: () => <View />,
    headerTitle: () => <View />,
    headerRight: () => (
      <ButtonIcon
        style={headerStyle.icon}
        size={ButtonIconSizes.Lg}
        iconName={IconName.Close}
        testID="exit-onboarding-button"
        onPress={handleClosePress}
      />
    ),
    gestureEnabled: false,
  };
};

// Navigation options for KYC status screens (VALIDATING_KYC, KYC_FAILED)
// These screens should exit directly without confirmation alert
export const KYCStatusNavigationOptions = ({
  navigation,
}: {
  navigation: {
    dispatch: (action: ReturnType<typeof StackActions.popToTop>) => void;
  };
}): StackNavigationOptions => ({
  headerLeft: () => <View />,
  headerTitle: () => <View />,
  headerRight: () => (
    <ButtonIcon
      style={headerStyle.icon}
      size={ButtonIconSizes.Lg}
      iconName={IconName.Close}
      testID="exit-onboarding-button"
      onPress={() => navigation.dispatch(StackActions.popToTop())}
    />
  ),
  gestureEnabled: false,
});

const OnboardingNavigator: React.FC = () => {
  const { cardUserPhase } = useParams<{
    cardUserPhase?: CardUserPhase;
  }>();
  const onboardingId = useSelector(selectOnboardingId);
  const { user, isLoading, fetchUserData, isReturningSession } = useCardSDK();
  const [isMounted, setIsMounted] = useState(false);
  const navigation = useNavigation();
  const hasShownKeepGoingModal = useRef(false);
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

  const initialRouteName = useMemo(() => {
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
    }

    // Priority 2: Use cached user data if available
    if (user?.verificationState && onboardingId) {
      if (user.verificationState === 'REJECTED') {
        return Routes.CARD.ONBOARDING.KYC_FAILED;
      }

      if (user.verificationState === 'UNVERIFIED') {
        if (!user?.phoneNumber) {
          return Routes.CARD.ONBOARDING.SET_PHONE_NUMBER;
        }

        return Routes.CARD.ONBOARDING.VERIFY_IDENTITY;
      }

      if (user.verificationState === 'PENDING') {
        if (!user.firstName) {
          return Routes.CARD.ONBOARDING.VERIFY_IDENTITY;
        }

        return Routes.CARD.ONBOARDING.VERIFYING_VERIFF_KYC;
      }

      if (user.verificationState === 'VERIFIED') {
        if (!user?.countryOfNationality) {
          return Routes.CARD.ONBOARDING.PERSONAL_DETAILS;
        }

        if (!user?.addressLine1 || !user?.city || !user?.zip) {
          return Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS;
        }

        return Routes.CARD.ONBOARDING.COMPLETE;
      }
    }

    // Default to SIGN_UP route if no user data is available
    return Routes.CARD.ONBOARDING.SIGN_UP;
  }, [user, cardUserPhase, onboardingId]);

  // Show "keep going" modal only when a returning user resumes an incomplete flow
  // isReturningSession is determined at CardSDKProvider mount (when card flow starts),
  // not when this navigator mounts, so it correctly identifies returning users
  useEffect(() => {
    if (
      isReturningSession &&
      initialRouteName !== Routes.CARD.ONBOARDING.SIGN_UP &&
      !hasShownKeepGoingModal.current &&
      user?.verificationState !== 'REJECTED'
    ) {
      hasShownKeepGoingModal.current = true;
      navigation.navigate(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.CONFIRM_MODAL,
        params: {
          title: strings('card.card_onboarding.keep_going.title'),
          description: strings('card.card_onboarding.keep_going.description'),
          confirmAction: {
            label: strings('card.card_onboarding.keep_going.confirm_button'),
            onPress: () => {
              (navigation.navigate as (route: string) => void)(initialRouteName);
            },
          },
          icon: IconName.ArrowDoubleRight,
        },
      });
    }
  }, [
    isReturningSession,
    initialRouteName,
    navigation,
    user?.verificationState,
  ]);

  if (isLoading && !user) {
    return (
      <Box twClassName="flex-1 items-center justify-center">
        <ActivityIndicator testID="activity-indicator" size="large" />
      </Box>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
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
        options={PostEmailNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER}
        component={ConfirmPhoneNumber}
        options={PostEmailNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VERIFY_IDENTITY}
        component={VerifyIdentity}
        options={PostEmailNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.WEBVIEW}
        component={KYCWebview}
        options={PostEmailNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.VERIFYING_VERIFF_KYC}
        component={VerifyingVeriffKYC}
        options={KYCStatusNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PERSONAL_DETAILS}
        component={PersonalDetails}
        options={PostEmailNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS}
        component={PhysicalAddress}
        options={PostEmailNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.COMPLETE}
        component={Complete}
        options={cardDefaultNavigationOptions}
      />
      <Stack.Screen
        name={Routes.CARD.ONBOARDING.KYC_FAILED}
        component={KYCFailed}
        options={KYCStatusNavigationOptions}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
