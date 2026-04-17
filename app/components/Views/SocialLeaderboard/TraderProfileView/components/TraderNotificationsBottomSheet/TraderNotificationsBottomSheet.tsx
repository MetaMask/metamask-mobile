import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Switch, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
import { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { ButtonVariants } from '../../../../../../component-library/components/Buttons/Button/Button.types';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectSocialLeaderboardEnabled } from '../../../../../../selectors/featureFlagController/socialLeaderboard';
import { useTopTraders } from '../../../../Homepage/Sections/TopTraders/hooks';
import { useNotificationPreferences } from '../../../NotificationPreferencesView/hooks';
import { TraderNotificationsBottomSheetSelectorsIDs } from './TraderNotificationsBottomSheet.testIds';

export interface TraderNotificationsBottomSheetRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}

interface TraderNotificationsBottomSheetProps {
  traderId: string;
  traderName: string;
  onDismiss?: () => void;
}

const TraderNotificationsBottomSheet = forwardRef<
  TraderNotificationsBottomSheetRef,
  TraderNotificationsBottomSheetProps
>(({ traderId, traderName, onDismiss }, ref) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tw = useTailwind();
  const { colors, brandColors } = useTheme();
  const navigation = useNavigation();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);

  const { traders } = useTopTraders({ enabled: isEnabled });
  const followedTraders = traders.filter((t) => t.isFollowing);

  const { preferences, toggleTraderNotification } =
    useNotificationPreferences(followedTraders);

  const globalOff = !preferences.enabled;
  const isTraderNotificationEnabled =
    preferences.traderNotifications[traderId] ?? false;

  const handleSheetClosed = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const closeSheet = useCallback(() => {
    if (!sheetRef.current) {
      setIsVisible(false);
      onDismiss?.();
      return;
    }
    sheetRef.current.onCloseBottomSheet(() => {
      setIsVisible(false);
    });
  }, [onDismiss]);

  useImperativeHandle(
    ref,
    () => ({
      onOpenBottomSheet: () => {
        if (!isVisible) {
          setIsVisible(true);
          return;
        }
        sheetRef.current?.onOpenBottomSheet();
      },
      onCloseBottomSheet: () => {
        closeSheet();
      },
    }),
    [closeSheet, isVisible],
  );

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleManageTradersPress = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.NOTIFICATION_PREFERENCES);
    });
  }, [navigation]);

  const handleSave = useCallback(() => {
    closeSheet();
  }, [closeSheet]);

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

      {/* Push notification toggle row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-4"
      >
        <Box twClassName="flex-1 mr-3">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {strings(
              'social_leaderboard.trader_notifications.allow_push_notifications',
            )}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-0.5"
          >
            {strings(
              'social_leaderboard.trader_notifications.allow_push_notifications_desc',
              { traderName },
            )}
          </Text>
        </Box>
        <Switch
          value={isTraderNotificationEnabled}
          onValueChange={() => {
            if (!globalOff) {
              toggleTraderNotification(traderId);
            }
          }}
          disabled={globalOff}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={brandColors.white}
          ios_backgroundColor={colors.border.muted}
          testID={TraderNotificationsBottomSheetSelectorsIDs.TOGGLE}
        />
      </Box>

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
});

export default TraderNotificationsBottomSheet;
