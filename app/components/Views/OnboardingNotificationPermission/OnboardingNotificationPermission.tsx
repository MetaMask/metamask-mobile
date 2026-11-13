import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ImageBackground } from 'react-native';
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import BoxGlass from '../../../component-library/components-temp/BoxGlass/BoxGlass';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../core/NavigationService/types';
import { getHardwareTier } from '../../../util/deviceCapability';
import { useNetworkTier } from '../../../hooks/useNetworkTier';
import { isNotificationsFeatureEnabled } from '../../../util/notifications/constants';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { setPushPrePromptShown } from '../../../util/notifications/constants/notification-storage-keys';
import { resolveNativePushPermissionStatus } from '../../../util/notifications/utils/push-notification-status';
import { usePushPermissionNotificationSetup } from '../../../util/notifications/hooks/usePushPermissionNotificationSetup';
import { useEnableMarketingConsent } from '../../../util/notifications/hooks/useEnableMarketingConsent';
import { usePushPrePromptAnalytics } from '../../../util/notifications/hooks/usePushPrePromptAnalytics';
import NotificationService, {
  canOsPromptForPushPermission,
} from '../../../util/notifications/services/NotificationService';
import Logger from '../../../util/Logger';
import BackgroundImage from '../../../images/notification-onboarding-background.png';
import FoxImage from '../../../images/notification-onboarding-fox.png';
import { OnboardingNotificationPermissionTestIds } from './OnboardingNotificationPermission.testIds';

const METRICS_OPT_IN_LOCATION = 'onboarding_push_permission';

interface NotificationPreview {
  title: string;
  message: string;
  timestamp: string;
}

interface NotificationCardProps extends NotificationPreview {
  isGlass: boolean;
}

const NotificationCard = ({
  isGlass,
  message,
  timestamp,
  title,
}: NotificationCardProps): React.ReactElement => {
  const tw = useTailwind();

  return (
    <BoxGlass
      isGlass={isGlass}
      radiusClassName="rounded-xl"
      hasSheen
      style={tw.style('h-[72px] flex-row items-center px-4')}
      accessibilityLabel={`${title}. ${message}. ${timestamp}`}
    >
      <Image
        source={FoxImage}
        style={tw.style('mr-4 h-12 w-12 shrink-0 rounded-lg')}
      />
      <Box twClassName="min-w-0 flex-1">
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
          twClassName="pr-[50px]"
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {message}
        </Text>
      </Box>
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        twClassName="absolute right-3 top-2"
      >
        {timestamp}
      </Text>
    </BoxGlass>
  );
};

const OnboardingNotificationPermission = (): React.ReactElement => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'OnboardingNotificationPermission'>
    >();
  const { accountType, onComplete, shouldShowQuestionnaire } = route.params;
  const [isResolving, setIsResolving] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nativeOsPermissionEnabled, setNativeOsPermissionEnabled] =
    useState(false);
  const [hardwareTier] = useState(getHardwareTier);
  const networkTier = useNetworkTier();

  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );

  const { enableMarketingConsent } = useEnableMarketingConsent({
    metricsOptInLocation: METRICS_OPT_IN_LOCATION,
  });
  const { enableNotificationsInBackground, requestPushPermission } =
    usePushPermissionNotificationSetup();
  const {
    identifyPushNotificationsEnabled,
    trackOsPromptResponse,
    trackOsPromptShown,
    trackPrePromptButtonClicked,
    trackPrePromptViewed,
  } = usePushPrePromptAnalytics();

  const navigateForward = useCallback(() => {
    if (shouldShowQuestionnaire) {
      navigation.navigate(Routes.ONBOARDING.INTEREST_QUESTIONNAIRE, {
        onComplete,
        ...(accountType && { accountType }),
      });
      return;
    }
    onComplete();
  }, [accountType, navigation, onComplete, shouldShowQuestionnaire]);

  useEffect(() => {
    let cancelled = false;

    const resolveEligibility = async (): Promise<void> => {
      const isEligible =
        isNotificationsFeatureEnabled() &&
        isBasicFunctionalityEnabled;

      if (!isEligible) {
        if (!cancelled) {
          navigateForward();
        }
        return;
      }

      try {
        const status = await resolveNativePushPermissionStatus();
        if (
          status.nativeOsPermissionEnabled ||
          !status.nativeOsPermissionPromptable
        ) {
          if (!cancelled) {
            navigateForward();
          }
          return;
        }

        if (!cancelled) {
          setNativeOsPermissionEnabled(status.nativeOsPermissionEnabled);
          setIsResolving(false);
          await setPushPrePromptShown();
          trackPrePromptViewed('push_permission');
        }
      } catch (error) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'Failed to resolve onboarding notification permission',
        );
        if (!cancelled) {
          navigateForward();
        }
      }
    };

    resolveEligibility();
    return () => {
      cancelled = true;
    };
  }, [
    isBasicFunctionalityEnabled,
    navigateForward,
    trackPrePromptViewed,
  ]);

  const handleEnableNotifications = useCallback(async (): Promise<void> => {
    setIsSubmitting(true);
    trackPrePromptButtonClicked('push_permission', 'yes');
    let permissionEnabled = nativeOsPermissionEnabled;

    try {
      await enableMarketingConsent();
      if (!permissionEnabled) {
        if (!canOsPromptForPushPermission()) {
          await NotificationService.requestPushNotificationsPermission();
        } else {
          trackOsPromptShown('push_permission');
          permissionEnabled = await requestPushPermission();
          trackOsPromptResponse(
            'push_permission',
            permissionEnabled ? 'allowed' : 'denied',
          );
        }
      }
      await identifyPushNotificationsEnabled(permissionEnabled);
      await enableNotificationsInBackground(permissionEnabled);
    } finally {
      navigateForward();
    }
  }, [
    enableMarketingConsent,
    enableNotificationsInBackground,
    identifyPushNotificationsEnabled,
    nativeOsPermissionEnabled,
    navigateForward,
    requestPushPermission,
    trackOsPromptResponse,
    trackOsPromptShown,
    trackPrePromptButtonClicked,
  ]);

  const handleSkip = useCallback(() => {
    trackPrePromptButtonClicked('push_permission', 'not_now');
    navigateForward();
  }, [navigateForward, trackPrePromptButtonClicked]);

  const previews = useMemo<NotificationPreview[]>(
    () => [
      {
        title: strings(
          'notifications.push_onboarding.onboarding.preview_price.title',
        ),
        message: strings(
          'notifications.push_onboarding.onboarding.preview_price.message',
        ),
        timestamp: strings(
          'notifications.push_onboarding.onboarding.preview_price.time',
        ),
      },
      {
        title: strings(
          'notifications.push_onboarding.onboarding.preview_transaction.title',
        ),
        message: strings(
          'notifications.push_onboarding.onboarding.preview_transaction.message',
        ),
        timestamp: strings(
          'notifications.push_onboarding.onboarding.preview_transaction.time',
        ),
      },
      {
        title: strings(
          'notifications.push_onboarding.onboarding.preview_prediction.title',
        ),
        message: strings(
          'notifications.push_onboarding.onboarding.preview_prediction.message',
        ),
        timestamp: strings(
          'notifications.push_onboarding.onboarding.preview_prediction.time',
        ),
      },
    ],
    [],
  );

  if (isResolving) {
    return <SafeAreaView style={tw.style('flex-1 bg-default')} />;
  }

  const shouldBlurBackground =
    hardwareTier !== 'LOW' && networkTier !== 'NONE';

  return (
    <SafeAreaView
      edges={['bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={OnboardingNotificationPermissionTestIds.SCREEN}
    >
      <HeaderStandardGlass
        isGlass={shouldBlurBackground}
        isFloating={false}
        includesTopInset
        onBack={navigation.goBack}
        title=""
        twClassName="px-1"
      />
      <Box twClassName="flex-1 px-4">
        <TitleStandard
          title={strings('notifications.push_onboarding.onboarding.title')}
          bottomLabel={strings(
            'notifications.push_onboarding.onboarding.body',
          )}
          twClassName="pt-3"
        />

        <Box twClassName="mt-8 flex-1 overflow-hidden">
          <ImageBackground
            source={BackgroundImage}
            resizeMode="contain"
            style={[
              tw.style('absolute left-0 right-0 top-0 bottom-0 opacity-70'),
              { transform: [{ scale: 1.08 }] },
            ]}
          />
          <Box twClassName="mt-[92px] gap-[14px] px-1">
            {previews.map((preview) => (
              <NotificationCard
                key={preview.title}
                {...preview}
                isGlass={shouldBlurBackground}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Box twClassName="gap-4 px-4 pb-2 pt-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isSubmitting}
          onPress={handleEnableNotifications}
          testID={OnboardingNotificationPermissionTestIds.ENABLE_BUTTON}
        >
          {strings('notifications.push_onboarding.onboarding.enable')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={isSubmitting}
          onPress={handleSkip}
          testID={OnboardingNotificationPermissionTestIds.SKIP_BUTTON}
        >
          {strings('notifications.push_onboarding.onboarding.skip')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default OnboardingNotificationPermission;
