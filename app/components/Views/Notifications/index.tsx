import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { NotificationsViewSelectorsIDs } from '../../../../e2e/selectors/wallet/NotificationsView.selectors';
import styles from './styles';
import Notifications from '../../UI/Notification/List';
import { TRIGGER_TYPES, sortNotifications } from '../../../util/notifications';
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

const TRIGGER_TYPES_VALS: ReadonlySet<string> = new Set<string>(
  Object.values(TRIGGER_TYPES),
);

const NotificationsView = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { isLoading } = useListNotifications();
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const { markNotificationAsRead, loading } = useMarkNotificationAsRead();
  const notifications = useSelector(getNotificationsList);

  const handleMarkAllAsRead = useCallback(() => {
    markNotificationAsRead(notifications);
    NotificationsService.setBadgeCount(0);
    trackEvent(createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_MARKED_ALL_AS_READ).build());
  }, [markNotificationAsRead, notifications, trackEvent, createEventBuilder]);

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

  // Wallet notifications = On-Chain + Feature Announcements
  const walletNotifications = useMemo(
    () => allNotifications.filter((n) => TRIGGER_TYPES_VALS.has(n.type)),
    [allNotifications],
  );

  // NOTE - We currently do not support web3 notifications
  const announcementNotifications = useMemo(() => [], []);

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.isRead).length,
    [allNotifications],
  );

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

NotificationsView.navigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<Record<string, undefined>>;
}) => ({
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
    <Text variant={TextVariant.HeadingMD} style={styles.title}>
      {strings('app_settings.notifications_title')}
    </Text>
  ),
});
