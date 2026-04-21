import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
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
import { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { ButtonVariants } from '../../../../../../component-library/components/Buttons/Button/Button.types';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import type { NotificationPreferences } from '../../../NotificationPreferencesView/hooks';
import AllowPushNotificationsRow from '../../../NotificationPreferencesView/components/AllowPushNotificationsRow';
import { TraderNotificationsBottomSheetSelectorsIDs } from './TraderNotificationsBottomSheet.testIds';

export interface TraderNotificationsBottomSheetRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}

interface TraderNotificationsBottomSheetProps {
  traderId: string;
  traderName: string;
  preferences: NotificationPreferences;
  toggleTraderNotification: (traderId: string) => void;
  onDismiss?: () => void;
}

const TraderNotificationsBottomSheet = forwardRef<
  TraderNotificationsBottomSheetRef,
  TraderNotificationsBottomSheetProps
>(
  (
    { traderId, traderName, preferences, toggleTraderNotification, onDismiss },
    ref,
  ) => {
    const sheetRef = useRef<BottomSheetRef>(null);
    const [isVisible, setIsVisible] = useState(false);
    const tw = useTailwind();
    const navigation = useNavigation();

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

        <AllowPushNotificationsRow
          title={strings(
            'social_leaderboard.trader_notifications.allow_push_notifications',
          )}
          description={strings(
            'social_leaderboard.trader_notifications.allow_push_notifications_desc',
            { traderName },
          )}
          value={isTraderNotificationEnabled}
          onValueChange={() => {
            if (!globalOff) {
              toggleTraderNotification(traderId);
            }
          }}
          disabled={globalOff}
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
