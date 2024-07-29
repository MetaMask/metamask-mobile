/* eslint-disable react/display-name */
import React, { useCallback, useEffect, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { NotificationsViewSelectorsIDs } from '../../../../e2e/selectors/NotificationsView.selectors';
import { createStyles } from './styles';
import Notifications from '../../UI/Notification/List';
import { TRIGGER_TYPES, sortNotifications } from '../../../util/notifications';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

import Button, {
  ButtonVariants,
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

const TRIGGER_TYPES_VALS: ReadonlySet<string> = new Set<string>(
  Object.values(TRIGGER_TYPES),
);

const NotificationsView = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => {
  const styles = createStyles();
  const { listNotifications, isLoading } = useListNotifications();
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const { markNotificationAsRead, loading } = useMarkNotificationAsRead();
  const notifications = useSelector(getNotificationsList);

  const handleMarkAllAsRead = useCallback(() => {
    markNotificationAsRead(notifications);
  }, [markNotificationAsRead, notifications]);

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

  // Effect - fetch notifications when component/view is visible.
  useEffect(() => {
    async function updateNotifications() {
      await listNotifications();
    }
    updateNotifications();
  }, [listNotifications]);

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
          <Button
            variant={ButtonVariants.Primary}
            label={strings('notifications.mark_all_as_read')}
            onPress={handleMarkAllAsRead}
            style={styles.stickyButton}
            disabled={loading}
          />
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
    <TouchableOpacity
      onPress={() => navigation.navigate(Routes.SETTINGS.NOTIFICATIONS)}
    >
      <Icon
        name={IconName.Setting}
        size={IconSize.Lg}
        style={createStyles().icon}
      />
    </TouchableOpacity>
  ),
  headerLeft: () => (
    <TouchableOpacity onPress={() => navigation.navigate(Routes.WALLET.HOME)}>
      <Icon
        name={IconName.Close}
        size={IconSize.Md}
        style={createStyles().icon}
      />
    </TouchableOpacity>
  ),
  headerTitle: () => (
    <Text variant={TextVariant.HeadingMD}>
      {strings('app_settings.notifications_title')}
    </Text>
  ),
});
