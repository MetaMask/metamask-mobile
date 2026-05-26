import React, { forwardRef, useCallback } from 'react';
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
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  fireSwitchHaptic,
  ImpactFeedbackStyle,
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
>(({ traderId, traderName, onDismiss }, ref) => {
  const {
    preferences,
    hasNotificationPreferences,
    isTraderNotificationEnabled,
    toggleTraderNotification,
  } = useNotificationPreferences();
  const tw = useTailwind();
  const navigation = useNavigation();

  const { sheetRef, isVisible, closeSheet, handleSheetClosed } =
    useControllableBottomSheet({ ref, onDismiss });

  const pushNotificationsOff =
    !hasNotificationPreferences || !preferences.pushNotificationsEnabled;

  // The hook is the single source of truth: it serves an optimistic overlay
  // that flips instantly on tap, drops only once the remote catches up, and
  // rolls back on failed PUTs. Reading it directly avoids stale local state
  // surviving across open/close cycles.
  const enabled = isTraderNotificationEnabled(traderId);

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
          description: strings(
            'app_settings.notifications_opts.social_ai_desc',
          ),
        },
      });
    });
  }, [hasNotificationPreferences, navigation, sheetRef]);

  const handleToggle = useCallback(() => {
    if (pushNotificationsOff) {
      return;
    }
    // Subordinate switch: rely on iOS UISwitch's native tick on iOS,
    // fire a Light impact only on Android where there is none.
    fireSwitchHaptic(ImpactFeedbackStyle.Light);
    toggleTraderNotification(traderId);
  }, [pushNotificationsOff, toggleTraderNotification, traderId]);

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
        value={enabled}
        onValueChange={handleToggle}
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
          twClassName="px-4 py-4 mb-4"
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
    </BottomSheet>
  );
});

export default TraderNotificationsBottomSheet;
