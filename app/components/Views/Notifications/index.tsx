/* eslint-disable react/display-name */
import React, { useCallback, useEffect, useState } from 'react';
import { InteractionManager, View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';

import { NotificationsViewSelectorsIDs } from '../../../../e2e/selectors/NotificationsView.selectors';
import { createStyles } from './styles';
import Notifications from '../../UI/Notification/List';
import {
  FeatureAnnouncementRawNotification,
  HalRawNotification,
  Notification,
  TRIGGER_TYPES,
  sortNotifications,
} from '../../../util/notifications';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Empty from '../../UI/Notification/Empty';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';

const NotificationsView = ({
  navigation,
  selectedAddress,
  notifications,
}: {
  navigation: any;
  selectedAddress: string;
  notifications: Notification[];
}) => {
  const styles = createStyles();
  const [allNotifications, setAllNotifications] =
    useState<Notification[]>(notifications);
  const [walletNotifications, setWalletNotifications] = useState<
    HalRawNotification[]
  >([]);
  const [annoucementsNotifications, setAnnoucementsNotifications] = useState<
    FeatureAnnouncementRawNotification[]
  >([]);
  const isNotificationEnabled = useSelector(
    (state: any) => state.notification.notificationsSettings?.isEnabled,
  );
  const [loading, setLoading] = useState<boolean>(false);

  const filterNotifications = useCallback(
    (address) => {
      if (address === null) {
        setLoading(false);
        return;
      }

      const wallet: HalRawNotification[] = [];
      const annoucements: FeatureAnnouncementRawNotification[] = [];
      const uniqueNotifications: Notification[] = [];

      const allNotificationsSorted = sortNotifications(allNotifications);
      const seenIds = new Set();

      for (const notification of allNotificationsSorted) {
        if (!seenIds.has(notification.id)) {
          seenIds.add(notification.id);
          uniqueNotifications.push(notification);
          if (notification.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT) {
            annoucements.push(notification);
          } else {
            wallet.push(notification);
          }
        }
      }

      setAllNotifications(uniqueNotifications);
      setWalletNotifications(wallet);
      setAnnoucementsNotifications(annoucements);

      setLoading(false);
    },
    [allNotifications],
  );

  useEffect(() => {
    setLoading(true);
    InteractionManager.runAfterInteractions(() => {
      filterNotifications(selectedAddress);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress]);

  const notificationToShow =
    allNotifications || walletNotifications || annoucementsNotifications;

  /** Current address is an important piece of notification since it is
   * used by MM auth snap to derivated the token/identifier and to MM storage to store notifications
   * TODO: Need to figure out the best place to fetch notifications from MM auth when user switches accounts, Maybe on the Engine and store it on the redux store
   */

  return (
    <View
      style={styles.wrapper}
      testID={NotificationsViewSelectorsIDs.NOTIFICATIONS_CONTAINER}
    >
      {isNotificationEnabled && notificationToShow.length > 0 ? (
        <Notifications
          navigation={navigation}
          allNotifications={allNotifications}
          walletNotifications={walletNotifications}
          annoucementsNotifications={annoucementsNotifications}
          loading={loading}
        />
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
  navigation: any;
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
