import React, { useCallback, useMemo, useEffect } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  TRIGGER_TYPES,
  INotification,
} from '@metamask/notification-services-controller/notification-services';

import { useMetrics } from '../../../components/hooks/useMetrics';
import { NotificationsViewSelectorsIDs } from '../../../../e2e/selectors/wallet/NotificationsView.selectors';
import styles from './styles';
import Notifications from '../../UI/Notification/List';
import { sortNotifications } from '../../../util/notifications';
import { IconName } from '../../../component-library/components/Icons/Icon';

import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';

import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
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
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { NotificationMenuViewSelectorsIDs } from '../../../../e2e/selectors/Notifications/NotificationMenuView.selectors';

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

  // Wallet notifications
  const walletNotifications = useMemo(
    () =>
      (allNotifications ?? []).filter(
        (n) =>
          n.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT &&
          n.type !== TRIGGER_TYPES.SNAP,
      ),
    [allNotifications],
  );

  const announcementNotifications = useMemo(
    () =>
      (allNotifications ?? []).filter(
        (n) => n.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
      ),
    [allNotifications],
  );

  return {
    allNotifications,
    walletNotifications,
    announcementNotifications,
  };
}

const NotificationsView = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => {
  const { isLoading } = useListNotifications();
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const notifications = useSelector(getNotificationsList);

  const { handleMarkAllAsRead, loading } = useMarkAsReadCallback({
    notifications,
  });

  const { allNotifications, walletNotifications, announcementNotifications } =
    useNotificationFilters({ notifications });

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.isRead).length,
    [allNotifications],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <ButtonIcon
          size={ButtonIconSizes.Md}
          iconName={IconName.Setting}
          onPress={() => navigation.navigate(Routes.SETTINGS.NOTIFICATIONS)}
          style={styles.icon}
        />
      ),
      headerLeft: () => (
        <ButtonIcon
          size={ButtonIconSizes.Md}
          iconName={IconName.Close}
          onPress={() => navigation.navigate(Routes.WALLET.HOME)}
          style={styles.icon}
        />
      ),
      headerTitle: () => (
        <Text
          variant={TextVariant.HeadingMD}
          style={styles.title}
          testID={NotificationMenuViewSelectorsIDs.TITLE}
        >
          {strings('app_settings.notifications_title')}
        </Text>
      ),
    });
  }, [navigation]);

  return (
    <View
      style={styles.wrapper}
      testID={NotificationsViewSelectorsIDs.NOTIFICATIONS_CONTAINER}
    >
      {isNotificationEnabled && allNotifications.length > 0 ? (
        <>
          <Notifications
            navigation={navigation}
            allNotifications={allNotifications}
            walletNotifications={walletNotifications}
            web3Notifications={announcementNotifications}
            loading={isLoading}
          />
          {!isLoading && unreadCount > 0 && (
            <Button
              variant={ButtonVariants.Primary}
              label={strings('notifications.mark_all_as_read')}
              onPress={handleMarkAllAsRead}
              size={ButtonSize.Lg}
              style={styles.stickyButton}
              disabled={loading}
            />
          )}
        </>
      ) : (
        <Empty
          testID={NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER}
        />
      )}
    </View>
  );
};

export default NotificationsView;
