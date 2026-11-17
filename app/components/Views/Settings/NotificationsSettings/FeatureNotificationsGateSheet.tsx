import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetRef,
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  Text,
  TextVariant,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import { useFeatureNotificationsStatus } from './hooks/useFeatureNotificationsStatus';
import { useNotificationStoragePreferences } from './hooks/useNotificationStoragePreferences';
import {
  FEATURE_NOTIFICATIONS_GATE_COPY,
  type FeatureNotificationsGateFeature,
} from './featureNotificationsGateConfig';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { strings } from '../../../../../locales/i18n';
import NotifCard from '../../../UI/Notification/NotifCard';
import Logger from '../../../../util/Logger';
import { promptOsPushPermissionIfNeeded } from './promptOsPushPermission';

export interface FeatureNotificationsGateSheetParams {
  feature: FeatureNotificationsGateFeature;
  /**
   * When true, closes the sheet once the gate condition is satisfied.
   * Defaults to `true`.
   */
  autoDismiss?: boolean;
}

type FeatureNotificationsGateSheetRouteProp = RouteProp<
  { params: FeatureNotificationsGateSheetParams },
  'params'
>;

/**
 * The gate bottom sheet, registered as a `transparentModal` route in the root
 * modal flow. Living on the root stack guarantees it renders above all screen
 * content.
 *
 * Do not navigate here directly; render `FeatureNotificationsGate` inside the
 * gated screen instead.
 *
 * Layout mirrors the push-onboarding notification sheets: preview image,
 * centered title/subhead, and a single primary CTA that enables notifications
 * with in-app enabled and push enabled when OS permission is granted.
 */
export const FeatureNotificationsGateSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<FeatureNotificationsGateSheetRouteProp>();
  const { feature, autoDismiss = true } = params;
  const copy = FEATURE_NOTIFICATIONS_GATE_COPY[feature];

  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );
  const { enableNotifications } = useEnableNotifications({
    nudgeEnablePush: false,
    throwOnError: true,
  });
  const { refetch, updatePreferencesSection } =
    useNotificationStoragePreferences();
  const { isMasterEnabled, isPushEnabled, isInAppEnabled } =
    useFeatureNotificationsStatus(feature);

  const isGateSatisfied = isMasterEnabled && (isPushEnabled || isInAppEnabled);

  const sheetRef = useRef<BottomSheetRef>(null);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  // Focus-gated on purpose: the gate can become satisfied while another sheet
  // (e.g. Basic Functionality) is presented above this one, and closing then
  // would goBack against the wrong top-of-stack route. useFocusEffect defers
  // the auto-close until this sheet is the focused route again, so the
  // goBack in handleSheetClosed always pops this sheet.
  useFocusEffect(
    useCallback(() => {
      if (autoDismiss && isGateSatisfied) {
        sheetRef.current?.onCloseBottomSheet();
      }
    }, [autoDismiss, isGateSatisfied]),
  );

  const handleHeaderClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleSheetClosed = () => {
    navigation.goBack();
  };

  const showEnableErrorToast = useCallback(() => {
    toast({
      severity: ToastSeverity.Danger,
      title: strings('notifications.feature_gate.error'),
      showCloseButton: false,
    });
  }, []);

  const handleTurnOn = useCallback(async () => {
    if (!basicFunctionalityEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BASIC_FUNCTIONALITY,
        params: {
          caller: Routes.SETTINGS.NOTIFICATIONS,
        },
      });
      return;
    }

    setIsEnabling(true);
    try {
      const isPushGranted = await promptOsPushPermissionIfNeeded();
      // Read before enableNotifications: first-time setup seeds every feature
      // with push on, which would hide whether the user had already chosen it.
      // A denied OS prompt must not clear a push preference that is shared
      // with the user's other devices.
      const nextPushEnabled = isPushGranted || isPushEnabled;

      if (!isMasterEnabled) {
        await enableNotifications();
      }

      const { data: refreshedPreferences } = await refetch();
      const refreshedFeaturePreferences = refreshedPreferences?.[feature];

      if (!refreshedFeaturePreferences) {
        throw new Error(
          `No notification preferences found after enabling ${feature}`,
        );
      }

      if (
        refreshedFeaturePreferences.pushNotificationsEnabled !==
          nextPushEnabled ||
        !refreshedFeaturePreferences.inAppNotificationsEnabled
      ) {
        await updatePreferencesSection(feature, (section) => ({
          ...section,
          pushNotificationsEnabled: nextPushEnabled,
          inAppNotificationsEnabled: true,
        }));
      }

      sheetRef.current?.onCloseBottomSheet();
    } catch (error) {
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        message:
          'FeatureNotificationsGateSheet: failed to enable notifications',
        feature,
      });
      showEnableErrorToast();
    } finally {
      setIsEnabling(false);
    }
  }, [
    enableNotifications,
    basicFunctionalityEnabled,
    feature,
    isMasterEnabled,
    isPushEnabled,
    navigation,
    refetch,
    showEnableErrorToast,
    updatePreferencesSection,
  ]);

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleSheetClosed}
      testID={NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET}
    >
      <Box twClassName="pb-5 pt-0">
        <Box twClassName="mb-1 items-end pr-2">
          <ButtonIcon
            iconName={IconName.Close}
            iconProps={{ color: IconColor.IconDefault }}
            onPress={handleHeaderClose}
            testID={
              NotificationSettingsViewSelectorsIDs.FEATURE_GATE_CLOSE_BUTTON
            }
          />
        </Box>

        <Box twClassName="mb-2 px-6">
          <NotifCard
            title={strings(copy.previewTitleKey)}
            message={strings(copy.previewMessageKey)}
            timestamp={strings(copy.previewTimestampKey)}
          />
        </Box>

        <Box twClassName="px-4">
          <Text variant={TextVariant.HeadingLg} twClassName="mb-2 text-center">
            {strings(copy.titleKey)}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mb-7 text-center text-alternative"
          >
            {strings(copy.descriptionKey)}
          </Text>

          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={isEnabling}
            isDisabled={isEnabling}
            onPress={handleTurnOn}
            twClassName="rounded-xl"
            testID={
              NotificationSettingsViewSelectorsIDs.FEATURE_GATE_TURN_ON_BUTTON
            }
          >
            {strings('notifications.feature_gate.cta')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};
