import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import BottomSheet from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { ButtonVariants } from '../../../../../../component-library/components/Buttons/Button/Button.types';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  fireSwitchHaptic,
  ImpactFeedbackStyle,
  playImpact,
  ImpactMoment,
} from '../../../../../../util/haptics';
import { useNotificationPreferences } from '../../../NotificationPreferences/hooks';
import AllowPushNotificationsRow from '../../../NotificationPreferences/components/AllowPushNotificationsRow';
import { TraderNotificationsBottomSheetSelectorsIDs } from './TraderNotificationsBottomSheet.testIds';
import {
  useControllableBottomSheet,
  type ControllableBottomSheetRef,
} from '../hooks/useControllableBottomSheet';

export type TraderNotificationsBottomSheetRef = ControllableBottomSheetRef;

interface TraderNotificationsBottomSheetProps {
  traderId: string;
  traderName: string;
  onDismiss?: () => void;
}

const TraderNotificationsBottomSheet = forwardRef<
  TraderNotificationsBottomSheetRef,
  TraderNotificationsBottomSheetProps
>(
  (
    { traderId, traderName, onDismiss },
    ref,
  ) => {
    const {
      preferences,
      hasNotificationPreferences,
      isTraderNotificationEnabled,
      toggleTraderNotification,
    } = useNotificationPreferences();
    const [localEnabled, setLocalEnabled] = useState(() =>
      isTraderNotificationEnabled(traderId),
    );
    const tw = useTailwind();
    const navigation = useNavigation();

    const { sheetRef, isVisible, closeSheet, handleSheetClosed } =
      useControllableBottomSheet({ ref, onDismiss });

    const pushNotificationsOff =
      !hasNotificationPreferences || !preferences.pushNotificationsEnabled;

    // Snapshot the remote value each time the sheet opens so the toggle
    // always starts from the authoritative server state.
    useEffect(() => {
      if (isVisible) {
        setLocalEnabled(isTraderNotificationEnabled(traderId));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible]);

    const handleManageTradersPress = useCallback(() => {
      sheetRef.current?.onCloseBottomSheet(() => {
        if (!hasNotificationPreferences) {
          navigation.navigate(Routes.SETTINGS_VIEW, {
            screen: Routes.SETTINGS.NOTIFICATIONS,
          });
          return;
        }

        navigation.navigate(Routes.SETTINGS_VIEW, {
          screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
          params: {
            type: 'socialAI',
            title: strings('app_settings.notifications_opts.social_ai_title'),
            description: strings('app_settings.notifications_opts.social_ai_desc'),
          },
        });
      });
    }, [hasNotificationPreferences, navigation, sheetRef]);

    // Only persist when the user explicitly confirms with Save.
    // If the local draft differs from the remote value, issue one toggle call.
    // Save is a deliberate primary-action commit, so always fire the haptic
    // — including when the value didn't change — to acknowledge the press.
    const handleSave = useCallback(() => {
      playImpact(ImpactMoment.PrimaryCTA);
      if (localEnabled !== isTraderNotificationEnabled(traderId)) {
        toggleTraderNotification(traderId);
      }
      closeSheet();
    }, [
      closeSheet,
      isTraderNotificationEnabled,
      localEnabled,
      toggleTraderNotification,
      traderId,
    ]);

    if (!isVisible) {
      return null;
    }

    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack={false}
        isInteractable
        onClose={handleSheetClosed}
        testID={TraderNotificationsBottomSheetSelectorsIDs.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('social_leaderboard.trader_notifications.title', {
            traderName,
          })}
          titleProps={{
            variant: TextVariant.HeadingSm,
            fontWeight: FontWeight.Bold,
          }}
          onClose={closeSheet}
          closeButtonProps={{
            testID: TraderNotificationsBottomSheetSelectorsIDs.CLOSE_BUTTON,
          }}
        />

        <AllowPushNotificationsRow
          title={strings(
            'social_leaderboard.trader_notifications.allow_push_notifications',
          )}
          description={strings(
            'social_leaderboard.trader_notifications.allow_push_notifications_desc',
            { traderName },
          )}
          value={localEnabled}
          onValueChange={(next: boolean) => {
            if (pushNotificationsOff) {
              return;
            }
            // Subordinate switch: rely on iOS UISwitch's native tick on iOS,
            // fire a Light impact only on Android where there is none.
            fireSwitchHaptic(ImpactFeedbackStyle.Light);
            setLocalEnabled(next);
          }}
          disabled={pushNotificationsOff}
          toggleTestID={TraderNotificationsBottomSheetSelectorsIDs.TOGGLE}
        />

        <View style={tw.style('h-px bg-muted mx-4')} />

        {/* Manage traders row */}
        <TouchableOpacity
          onPress={handleManageTradersPress}
          testID={TraderNotificationsBottomSheetSelectorsIDs.MANAGE_TRADERS_ROW}
          accessibilityRole="button"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="px-4 py-4"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={3}
            >
              <Icon
                name={IconName.PageInfo}
                size={IconSize.Md}
                color={IconColor.IconDefault}
              />
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings(
                  'social_leaderboard.trader_notifications.manage_traders',
                )}
              </Text>
            </Box>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
        </TouchableOpacity>

        <BottomSheetFooter
          buttonPropsArray={[
            {
              variant: ButtonVariants.Primary,
              label: strings('social_leaderboard.trader_notifications.save'),
              onPress: handleSave,
              testID: TraderNotificationsBottomSheetSelectorsIDs.SAVE_BUTTON,
            },
          ]}
          style={tw.style('px-4 mb-4')}
        />
      </BottomSheet>
    );
  },
);

export default TraderNotificationsBottomSheet;
