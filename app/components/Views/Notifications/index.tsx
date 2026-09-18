import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { INotification } from '@metamask/notification-services-controller/notification-services';

import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { NotificationsViewSelectorsIDs } from './NotificationsView.testIds';
import styles from './styles';
import Notifications from '../../UI/Notification/List';
import { sortNotifications } from '../../../util/notifications';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { useTheme } from '../../../util/theme';

import {
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';

import DisabledNotifications from './DisabledNotifications';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  selectIsMetamaskNotificationsEnabled,
  getNotificationsList,
} from '../../../selectors/notifications';
import {
  useListNotifications,
  useMarkNotificationAsRead,
} from '../../../util/notifications/hooks/useNotifications';
import { useNotificationListPerformance } from '../../../util/notifications/hooks/useNotificationListPerformance';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { NotificationMenuViewSelectorsIDs } from './NotificationMenuView.testIds';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import {
  useNativeHeader,
  useNativeHeaderInset,
} from '../../hooks/useNativeHeader';

export function useMarkAsReadCallback(props: {
  notifications: INotification[];
}) {
  const { notifications } = props;
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { markNotificationAsRead, loading } = useMarkNotificationAsRead();

  const handleMarkAllAsRead = useCallback(() => {
    markNotificationAsRead(notifications);
    NotificationsService.setBadgeCount(0);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NOTIFICATIONS_MARKED_ALL_AS_READ,
      ).build(),
    );
  }, [markNotificationAsRead, notifications, trackEvent, createEventBuilder]);

  return {
    handleMarkAllAsRead,
    loading,
  };
}

export function useNotificationFilters(props: {
  notifications: INotification[];
}) {
  const { notifications } = props;

  const allNotifications = useMemo(() => {
    // All unique notifications
    const uniqueIDs = new Set<string>();
    const uniqueNotifications = notifications.filter((n) => {
      if (!uniqueIDs.has(n.id)) {
        uniqueIDs.add(n.id);
        return true;
      }
      return false;
    });
    const sortedNotifications = sortNotifications(uniqueNotifications);
    return sortedNotifications;
  }, [notifications]);

  return { allNotifications };
}

const NotificationsView = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => {
  const { colors } = useTheme();
  const { isLoading } = useListNotifications();
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const notifications = useSelector(getNotificationsList);
  const { allNotifications } = useNotificationFilters({ notifications });

  useNotificationListPerformance({
    isLoading,
    notificationCount: allNotifications.length,
    enabled: isNotificationEnabled,
  });

  const { handleMarkAllAsRead, loading } = useMarkAsReadCallback({
    notifications,
  });

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.isRead).length,
    [allNotifications],
  );

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(Routes.WALLET.HOME);
  }, [navigation]);

  const handleOpenSettings = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.NOTIFICATIONS);
  }, [navigation]);

  /*
   * The cog moves into the bar's trailing group; the close action is the
   * system back button this screen was pushed with.
   */
  const headerRightItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'button' as const,
        identifier: 'notifications-settings',
        label: '',
        icon: { type: 'sfSymbol' as const, name: 'gearshape' },
        variant: 'plain' as const,
        accessibilityLabel: strings('app_settings.title'),
        onPress: handleOpenSettings,
      },
    ],
    [handleOpenSettings],
  );

  /*
   * This is the initial route of the notifications stack, so native-stack
   * draws no back button for it — `headerBackVisible` has "no effect on the
   * first screen in the stack". The chevron has to be supplied here, and it
   * runs `handleClose`, which falls back to Home when there is nothing to pop.
   */
  const headerLeftItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'button' as const,
        identifier: 'notifications-back',
        label: '',
        icon: { type: 'sfSymbol' as const, name: 'chevron.backward' },
        variant: 'plain' as const,
        accessibilityLabel: strings('navigation.back'),
        onPress: handleClose,
      },
    ],
    [handleClose],
  );

  const isNativeHeaderEnabled = useNativeHeader({
    title: strings('app_settings.notifications_title'),
    leftItems: headerLeftItems,
    rightItems: headerRightItems,
  });
  const nativeHeaderInset = useNativeHeaderInset();

  return (
    <SafeAreaView
      edges={isNativeHeaderEnabled ? [] : ['top']}
      style={[styles.wrapper, { backgroundColor: colors.background.default }]}
    >
      {!isNativeHeaderEnabled && (
        <HeaderCompactStandard
          title={strings('app_settings.notifications_title')}
          titleProps={{ testID: NotificationMenuViewSelectorsIDs.TITLE }}
          onBack={handleClose}
          backButtonProps={{
            testID: NotificationMenuViewSelectorsIDs.CLOSE_BUTTON,
          }}
          endButtonIconProps={[
            {
              iconName: IconName.Setting,
              onPress: handleOpenSettings,
              testID: NotificationMenuViewSelectorsIDs.COG_WHEEL,
            },
          ]}
        />
      )}
      <View
        style={[styles.wrapper, { paddingTop: nativeHeaderInset }]}
        testID={NotificationsViewSelectorsIDs.NOTIFICATIONS_CONTAINER}
      >
        {isNotificationEnabled ? (
          <>
            <Notifications
              navigation={navigation}
              allNotifications={allNotifications}
              loading={isLoading}
            />
            {!isLoading && unreadCount > 0 && (
              <Button
                variant={ButtonVariant.Primary}
                onPress={handleMarkAllAsRead}
                size={ButtonSize.Lg}
                style={styles.stickyButton}
                isDisabled={loading}
              >
                {strings('notifications.mark_all_as_read')}
              </Button>
            )}
          </>
        ) : (
          <DisabledNotifications onEnableNotifications={handleOpenSettings} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default NotificationsView;
