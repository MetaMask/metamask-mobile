/* eslint-disable react/display-name */
import React, { useCallback, useEffect, useState } from 'react';
import { InteractionManager, View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { NotificationsViewSelectorsIDs } from '../../../../e2e/selectors/NotificationsView.selectors';
import { createStyles } from './styles';
import Notifications from './List';
import { Notification, TRIGGER_TYPES } from '../../../util/notifications';
import mockNotifications from './Mock/notifications';
import { sortNotifications } from './utils';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Empty from './Empty';
import { strings } from '../../../../locales/i18n';

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
  const [allNotifications, setAllTransactions] = useState<Notification[]>(
    notifications || mockNotifications,
  );
  const [walletNotifications, setWalletNotifications] = useState<
    Notification[]
  >([]);
  const [web3Notifications, setWeb3Notifications] = useState<Notification[]>(
    [],
  );
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

      const wallet: any = [];
      const web3: any = [];

      /**
       * Sort notifications by time and remove duplicates
       */
      const allNotificationsSorted = sortNotifications(allNotifications).filter(
        (notification, index, self) =>
          self.findIndex(
            (_notification) => _notification.id === notification.id,
          ) === index,
      );

      setAllTransactions(allNotificationsSorted);

      /**
       * Based on a sorted and deduplicated list of notifications, filter notifications by type to populate different tabs
       */

      allNotificationsSorted.filter((notification) => {
        switch (notification.type) {
          case TRIGGER_TYPES.FEATURES_ANNOUNCEMENT:
            web3.push(notification);
            break;
          default:
            wallet.push(notification);
        }
        return notification;
      });

      setWalletNotifications(wallet);
      setWeb3Notifications(web3);

      setLoading(false);
    },
    [allNotifications],
  );
  useEffect(() => {
    setLoading(true);
    InteractionManager.runAfterInteractions(() => {
      filterNotifications('0X1234'); //TODO: When MM auth is ready, replace this with selectedAddress
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isNotificationEnabled) navigation.navigate('WalletView');
    }, [navigation, isNotificationEnabled]),
  );

  /** Current address is an important piece of notification since it is
   * used by MM auth snap to derivated the token/identifier and to MM storage to store notifications */

  // TODO: Need to figure out the best place to fetch notifications from MM auth when user switches accounts, Maybe on the Engine and store it on the redux store

  return (
    <View
      style={styles.wrapper}
      testID={NotificationsViewSelectorsIDs.NOTIFICATIONS_CONTAINER}
    >
      {mockNotifications || isNotificationEnabled ? (
        <Notifications
          navigation={navigation}
          allNotifications={allNotifications}
          walletNotifications={walletNotifications}
          web3Notifications={web3Notifications}
          loading={loading}
        />
      ) : (
        <Empty />
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
      onPress={() => navigation.navigate('NotificationsSettings')}
    >
      <Icon
        name={IconName.Setting}
        size={IconSize.Lg}
        style={createStyles().icon}
      />
    </TouchableOpacity>
  ),
  headerLeft: () => (
    <TouchableOpacity onPress={() => navigation.goBack()}>
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
