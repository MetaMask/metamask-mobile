import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, Image, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import FooterGlass from '../../../component-library/components-temp/FooterGlass';
import { useHeaderGlassInset } from '../../../component-library/components-temp/HeaderGlass';
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
import { setPushPrePromptAnswered } from '../../../util/notifications/constants/notification-storage-keys';
import { resolveNativePushPermissionStatus } from '../../../util/notifications/utils/push-notification-status';
import { usePushPermissionNotificationSetup } from '../../../util/notifications/hooks/usePushPermissionNotificationSetup';
import { useEnableMarketingConsent } from '../../../util/notifications/hooks/useEnableMarketingConsent';
import { usePushPrePromptAnalytics } from '../../../util/notifications/hooks/usePushPrePromptAnalytics';
import { selectIsUnlocked } from '../../../selectors/keyringController';
import { selectIsUpdatingMetamaskNotifications } from '../../../selectors/notifications';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import LightBackgroundImage from '../../../images/notification-onboarding-background-light.png';
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
  const { colors, shadows } = useTheme();

  return (
    <BoxGlass
      isGlass={isGlass}
      tintColor={`${colors.background.default}66`}
      radiusClassName="rounded-xl"
      containerStyle={[tw.style('border border-muted'), shadows.size.sm]}
      style={tw.style('h-[72px] flex-row items-center px-4')}
      accessibilityLabel={`${title}. ${message}. ${timestamp}`}
    >
      <Image
        source={FoxImage}
        style={tw.style(
          'mr-4 h-12 w-12 shrink-0 rounded-lg border border-muted',
        )}
      />
      <Box twClassName="min-w-0 flex-1">
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
          twClassName="pr-12"
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
  const { themeAppearance, colors } = useTheme();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    true,
    safeAreaTop,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'OnboardingNotificationPermission'>
    >();
  const { accountType, onComplete, shouldShowQuestionnaire } = route.params;
  const [isResolving, setIsResolving] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupFailed, setSetupFailed] = useState(false);
  const submittingRef = useRef(false);
  const isUnlocked = useSelector(selectIsUnlocked);
  const isUpdating = useSelector(selectIsUpdatingMetamaskNotifications);
  const isReady = isUnlocked && !isUpdating;
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
    usePushPermissionNotificationSetup({ onboarding: true });
  const {
    identifyPushNotificationsEnabled,
    trackOsPromptResponse,
    trackOsPromptShown,
    trackPrePromptButtonClicked,
    trackPrePromptViewed,
  } = usePushPrePromptAnalytics(METRICS_OPT_IN_LOCATION);

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
        isNotificationsFeatureEnabled() && isBasicFunctionalityEnabled;

      if (!isEligible) {
        if (!cancelled) {
          navigateForward();
        }
        return;
      }

      try {
        const status = await resolveNativePushPermissionStatus();
        if (
          !status.nativeOsPermissionEnabled &&
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

    void resolveEligibility();
    return () => {
      cancelled = true;
    };
  }, [isBasicFunctionalityEnabled, navigateForward, trackPrePromptViewed]);

  const handleEnableNotifications = useCallback(async (): Promise<void> => {
    if (submittingRef.current || !isReady) {
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setSetupFailed(false);
    try {
      // Record the answer before leaving onboarding or opening the native dialog.
      await setPushPrePromptAnswered();
      trackPrePromptButtonClicked('push_permission', 'yes');
      let permissionEnabled = nativeOsPermissionEnabled;
      if (!permissionEnabled) {
        trackOsPromptShown('push_permission');
        permissionEnabled = await requestPushPermission();
        trackOsPromptResponse(
          'push_permission',
          permissionEnabled ? 'allowed' : 'denied',
        );
      }
      await identifyPushNotificationsEnabled(permissionEnabled);
      if (permissionEnabled) {
        const enabled = await enableNotificationsInBackground(true);
        // Stay on the screen so setup can be retried if readiness changed or setup failed.
        if (!enabled) {
          setSetupFailed(true);
          return;
        }
        await enableMarketingConsent();
      }
      // Denial is not consent to in-app notifications or marketing.
      navigateForward();
    } catch (error) {
      setSetupFailed(true);
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Failed to complete onboarding notification setup',
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    isReady,
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

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => true,
      );
      return () => subscription.remove();
    }, []),
  );

  const handleSkip = useCallback(async () => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setSetupFailed(false);
    try {
      await setPushPrePromptAnswered();
      trackPrePromptButtonClicked('push_permission', 'not_now');
      navigateForward();
    } catch (error) {
      setSetupFailed(true);
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Failed to record onboarding notification answer',
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
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

  const shouldBlurBackground = hardwareTier !== 'LOW' && networkTier !== 'NONE';

  return (
    <SafeAreaView
      edges={['bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={OnboardingNotificationPermissionTestIds.SCREEN}
    >
      <HeaderStandardGlass
        backdrop="static"
        onLayout={onHeaderLayout}
        includesTopInset
      />
      <Box twClassName="flex-1 px-4" style={{ marginTop: headerInset }}>
        <TitleStandard
          title={strings('notifications.push_onboarding.onboarding.title')}
          bottomLabel={strings('notifications.push_onboarding.onboarding.body')}
        />

        <Box twClassName="mt-8 flex-1 overflow-hidden">
          <ImageBackground
            testID={OnboardingNotificationPermissionTestIds.BACKGROUND}
            source={
              themeAppearance === AppThemeKey.dark
                ? BackgroundImage
                : LightBackgroundImage
            }
            resizeMode="contain"
            style={[
              tw.style('absolute left-0 right-0 top-0 bottom-0 opacity-60'),
              {
                transform: [
                  { scale: themeAppearance === AppThemeKey.dark ? 1.08 : 1 },
                ],
              },
            ]}
          />
          {themeAppearance === AppThemeKey.light && (
            <LinearGradient
              pointerEvents="none"
              colors={[
                `${colors.background.default}00`,
                colors.background.default,
              ]}
              style={tw.style('absolute bottom-0 left-0 right-0 h-24')}
            />
          )}
          <Box twClassName="mt-24 gap-3 px-1">
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

      {setupFailed && (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          twClassName="px-4"
          testID={OnboardingNotificationPermissionTestIds.ERROR}
        >
          {strings('notifications.push_onboarding.onboarding.setup_error')}
        </Text>
      )}
      <FooterGlass
        twClassName="py-2"
        primaryButtonProps={{
          children: strings('notifications.push_onboarding.onboarding.enable'),
          size: ButtonSize.Lg,
          isLoading: isSubmitting,
          isDisabled: !isReady || isSubmitting,
          onPress: handleEnableNotifications,
          testID: OnboardingNotificationPermissionTestIds.ENABLE_BUTTON,
        }}
        tertiaryButtonProps={{
          children: strings('notifications.push_onboarding.onboarding.skip'),
          size: ButtonSize.Lg,
          isDisabled: isSubmitting,
          onPress: handleSkip,
          testID: OnboardingNotificationPermissionTestIds.SKIP_BUTTON,
        }}
      />
    </SafeAreaView>
  );
};

export default OnboardingNotificationPermission;
