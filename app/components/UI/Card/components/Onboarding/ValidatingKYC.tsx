import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { ActivityIndicator } from 'react-native';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';
import { useParams } from '../../../../../util/navigation/navUtils';
import Logger from '../../../../../util/Logger';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import { useDispatch } from 'react-redux';

const TIMEOUT_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

const ValidatingKYC = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const dispatch = useDispatch();
  const [shouldHideWebView, setShouldHideWebView] = useState(false);
  const [showTimeoutButton, setShowTimeoutButton] = useState(false);

  const { verificationState } = useUserRegistrationStatus();
  const { sessionUrl } = useParams<{ sessionUrl: string }>();

  useEffect(() => {
    if (verificationState === 'VERIFIED') {
      navigation.navigate(Routes.CARD.ONBOARDING.PERSONAL_DETAILS);
      return;
    }

    if (verificationState === 'REJECTED') {
      navigation.navigate(Routes.CARD.ONBOARDING.KYC_FAILED);
    }
  }, [verificationState, navigation]);

  // Timer for showing button after 2 minutes on PENDING without sessionUrl
  useEffect(() => {
    if (verificationState === 'PENDING' && !sessionUrl) {
      const timer = setTimeout(() => {
        setShowTimeoutButton(true);
        Logger.log('ValidatingKYC: Showing timeout button after 2 minutes');
      }, TIMEOUT_DURATION);

      return () => {
        clearTimeout(timer);
      };
    }

    // Reset button visibility if conditions change
    setShowTimeoutButton(false);
  }, [verificationState, sessionUrl]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    if (
      navState.url?.includes('www.veriff.com/get-verified?navigation=slim') ||
      navState.title?.includes(
        'Get Verified | Personal Data Protection Matters to Us - Veriff',
      )
    ) {
      setShouldHideWebView(true);
    }
  };
  // Show embedded WebView when we have a sessionUrl and are unverified
  if (verificationState === 'PENDING' && sessionUrl && !shouldHideWebView) {
    return (
      <SafeAreaView style={tw.style('flex-1')} edges={['bottom']}>
        <Box twClassName="flex-1">
          <WebView
            source={{ uri: sessionUrl }}
            style={tw.style('flex-1')}
            allowsInlineMediaPlayback
            onNavigationStateChange={(navState: WebViewNavigation) =>
              handleNavigationStateChange(navState)
            }
          />
        </Box>
      </SafeAreaView>
    );
  }

  const handleTimeoutAction = () => {
    dispatch(resetOnboardingState());
    navigation.navigate(Routes.CARD.AUTHENTICATION);
  };

  // Show loading state while waiting
  const renderFormFields = () => <ActivityIndicator />;

  const renderActions = () => {
    if (!showTimeoutButton) {
      return null;
    }

    return (
      <Button
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        label={strings('card.card_onboarding.validating_kyc.timeout_button')}
        onPress={handleTimeoutAction}
      />
    );
  };

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.validating_kyc.title')}
      description={''}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default ValidatingKYC;
