import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  navigateToNextOnboardingConsentStep,
  type OnboardingConsentFlowParams,
} from '../../../util/onboarding/onboardingConsentFlow';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { setPushPrePromptShown } from '../../../util/notifications/constants/notification-storage-keys';
import { resolveNativePushPermissionStatus } from '../../../util/notifications/utils/push-notification-status';
import { usePushPermissionNotificationSetup } from '../../../util/notifications/hooks/usePushPermissionNotificationSetup';
import { usePushPrePromptAnalytics } from '../../../util/notifications/hooks/usePushPrePromptAnalytics';
import NotificationService, {
  canOsPromptForPushPermission,
} from '../../../util/notifications/services/NotificationService';
import PushNotificationsPreview from '../../../images/push-notifications-onboarding-preview.png';
import { OnboardingPushNotificationsSelectorsIDs } from './OnboardingPushNotifications.testIds';

const OnboardingPushNotifications = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        { OnboardingPushNotifications: OnboardingConsentFlowParams },
        'OnboardingPushNotifications'
      >
    >();
  const consentParams = route.params;
  const didNavigateRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const { enableNotificationsInBackground, requestPushPermission } =
    usePushPermissionNotificationSetup();
  const {
    trackPrePromptViewed,
    trackPrePromptButtonClicked,
    trackOsPromptShown,
    trackOsPromptResponse,
    identifyPushNotificationsEnabled,
  } = usePushPrePromptAnalytics();

  const goToNext = useCallback(() => {
    if (didNavigateRef.current) {
      return;
    }
    didNavigateRef.current = true;
    navigateToNextOnboardingConsentStep(navigation, consentParams);
  }, [consentParams, navigation]);

  useEffect(() => {
    if (!isBasicFunctionalityEnabled) {
      goToNext();
      return;
    }

    setIsVisible(true);
    trackPrePromptViewed('push_permission');
    // Keeps the post-onboarding push sheet from asking a second time.
    setPushPrePromptShown().catch(() => undefined);
  }, [goToNext, isBasicFunctionalityEnabled, trackPrePromptViewed]);

  const handleYes = useCallback(async () => {
    let nativePermissionEnabled = false;
    trackPrePromptButtonClicked('push_permission', 'yes');
    try {
      const { nativeOsPermissionEnabled, nativeOsPermissionPromptable } =
        await resolveNativePushPermissionStatus();
      nativePermissionEnabled = nativeOsPermissionEnabled;

      if (!nativePermissionEnabled && nativeOsPermissionPromptable) {
        if (canOsPromptForPushPermission()) {
          trackOsPromptShown('push_permission');
          nativePermissionEnabled = await requestPushPermission();
          trackOsPromptResponse(
            'push_permission',
            nativePermissionEnabled ? 'allowed' : 'denied',
          );
        } else {
          await NotificationService.requestPushNotificationsPermission();
        }
      }
      identifyPushNotificationsEnabled(nativePermissionEnabled).catch(
        () => undefined,
      );
    } finally {
      enableNotificationsInBackground(nativePermissionEnabled, {
        hasMarketingConsent: false,
      });
      goToNext();
    }
  }, [
    enableNotificationsInBackground,
    goToNext,
    identifyPushNotificationsEnabled,
    requestPushPermission,
    trackOsPromptResponse,
    trackOsPromptShown,
    trackPrePromptButtonClicked,
  ]);

  const handleNotNow = useCallback(() => {
    trackPrePromptButtonClicked('push_permission', 'not_now');
    goToNext();
  }, [goToNext, trackPrePromptButtonClicked]);

  return (
    <SafeAreaView
      edges={{ bottom: 'maximum' }}
      style={tw.style('flex-1 bg-default pb-4', {
        paddingTop:
          Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 40,
      })}
      testID={OnboardingPushNotificationsSelectorsIDs.SCREEN}
    >
      {isVisible ? (
        <>
          {/* Stands in for the header the design reserves space for, without
              offering a back action out of the consent flow. */}
          <Box twClassName="h-14" />
          <Box twClassName="px-4 pt-4 gap-2">
            <Text
              variant={TextVariant.DisplayMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Bold}
              testID={OnboardingPushNotificationsSelectorsIDs.TITLE}
            >
              {strings('onboarding.push_notifications.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={OnboardingPushNotificationsSelectorsIDs.DESCRIPTION}
            >
              {strings('onboarding.push_notifications.description')}
            </Text>
          </Box>
          <Box
            twClassName="flex-1 justify-center"
            justifyContent={BoxJustifyContent.Center}
          >
            <Image
              source={PushNotificationsPreview}
              style={tw.style('w-full flex-1')}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel={strings(
                'onboarding.push_notifications.preview_accessibility_label',
              )}
              testID={OnboardingPushNotificationsSelectorsIDs.PREVIEW}
            />
          </Box>
          <Box twClassName="px-4 gap-4">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleYes}
              testID={OnboardingPushNotificationsSelectorsIDs.YES_BUTTON}
            >
              {strings('onboarding.push_notifications.cta_enable')}
            </Button>
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleNotNow}
              testID={OnboardingPushNotificationsSelectorsIDs.NOT_NOW_BUTTON}
            >
              {strings('onboarding.push_notifications.cta_skip')}
            </Button>
          </Box>
        </>
      ) : null}
    </SafeAreaView>
  );
};

export default OnboardingPushNotifications;
