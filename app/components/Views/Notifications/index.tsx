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

import Empty from '../../UI/Notification/Empty';
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
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { NotificationMenuViewSelectorsIDs } from './NotificationMenuView.testIds';

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

  const { handleMarkAllAsRead, loading } = useMarkAsReadCallback({
    notifications,
  });

  const { allNotifications } = useNotificationFilters({ notifications });

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

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.wrapper, { backgroundColor: colors.background.default }]}
    >
      <HeaderCompactStandard
        title={strings('app_settings.notifications_title')}
        titleProps={{ testID: NotificationMenuViewSelectorsIDs.TITLE }}
        startButtonIconProps={{
          iconName: IconName.Close,
          onPress: handleClose,
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
      <View
        style={styles.wrapper}
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
          <Empty
            testID={NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default NotificationsView;
