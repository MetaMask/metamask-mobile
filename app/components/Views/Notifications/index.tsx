import React, { useCallback, useMemo } from 'react';
import { View, SafeAreaView } from 'react-native';
import { useSelector } from 'react-redux';
import { INotification } from '@metamask/notification-services-controller/notification-services';

import { useMetrics } from '../../../components/hooks/useMetrics';
import { NotificationsViewSelectorsIDs } from './NotificationsView.testIds';
import createStyles from './styles';
import Notifications from '../../UI/Notification/List';
import { useTheme } from '../../../util/theme';
import { sortNotifications } from '../../../util/notifications';
import { IconName } from '@metamask/design-system-react-native';

import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
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
  const { trackEvent, createEventBuilder } = useMetrics();
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
  const theme = useTheme();
  const styles = createStyles(theme);
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

  return (
    <SafeAreaView
      style={styles.wrapper}
      testID={NotificationsViewSelectorsIDs.NOTIFICATIONS_CONTAINER}
    >
      <HeaderCenter
        title={strings('app_settings.notifications_title')}
        onBack={() => navigation.navigate(Routes.WALLET.HOME)}
        endButtonIconProps={[
          {
            iconName: IconName.Setting,
            onPress: () => navigation.navigate(Routes.SETTINGS.NOTIFICATIONS),
          },
        ]}
        testID={NotificationMenuViewSelectorsIDs.TITLE}
        includesTopInset
      />
      {isNotificationEnabled ? (
        <>
          <Notifications
            navigation={navigation}
            allNotifications={allNotifications}
            loading={isLoading}
          />
          {!isLoading && unreadCount > 0 && (
          <View style={styles.stickyButtonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('notifications.mark_all_as_read')}
              onPress={handleMarkAllAsRead}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              disabled={loading}
            />
          </View>
          )}
        </>
      ) : (
        <Empty
          testID={NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER}
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationsView;

NotificationsView.navigationOptions = {
  headerShown: false,
};
