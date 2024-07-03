import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import ScrollableTabView, {
  DefaultTabBar,
  DefaultTabBarProps,
  TabBarProps,
} from 'react-native-scrollable-tab-view';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import { useTheme } from '../../../../util/theme';
import { createStyles } from './styles';
import { useMetrics } from '../../../hooks/useMetrics';
import Empty from '../Empty';
import { NotificationRow } from '../Row';
import {
  Notification,
  getRowDetails,
  TRIGGER_TYPES,
} from '../../../../util/notifications';
import { NotificationsViewSelectorsIDs } from '../../../../../e2e/selectors/NotificationsView.selectors';
import Routes from '../../../../constants/navigation/Routes';

interface NotificationsList {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  allNotifications: Notification[];
  walletNotifications: Notification[];
  announcementsNotifications: Notification[];
  loading: boolean;
}

const Notifications = ({
  navigation,
  allNotifications,
  walletNotifications,
  announcementsNotifications,
  loading,
}: NotificationsList) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const { trackEvent } = useMetrics();

  const onPress = useCallback(
    (item: Notification) => {
      navigation.navigate(Routes.NOTIFICATIONS.DETAILS, { notification: item });
    },
    [navigation],
  );

  const renderTabBar = useCallback(
    (props: TabBarProps<DefaultTabBarProps>) => (
      <View>
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          activeTextColor={colors.primary.default}
          inactiveTextColor={colors.text.default}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          textStyle={styles.textStyle}
          style={styles.tabBar}
          {...props}
        />
      </View>
    ),
    [styles, colors],
  );

  const onChangeTab = useCallback(
    (obj) => {
      switch (obj.ref.props.tabLabel) {
        case strings('notifications.all'):
          trackEvent(MetaMetricsEvents.ALL_NOTIFICATIONS);
          break;
        case strings('notifications.wallet'):
          trackEvent(MetaMetricsEvents.WALLET_NOTIFICATIONS);
          break;
        case strings('notifications.web3'):
          trackEvent(MetaMetricsEvents.ANNOUCEMENTS_NOTIFICATIONS);
          break;
        default:
          break;
      }
    },
    [trackEvent],
  );

  const combinedLists = useMemo(
    () => [allNotifications, walletNotifications, announcementsNotifications],
    [allNotifications, walletNotifications, announcementsNotifications],
  );

  const renderNotificationRow = useCallback(
    (notification: Notification) => {
      const rowDetails = getRowDetails(notification);

      if (!rowDetails) {
        return null;
      }

      // TODO - handle feature announcement component
      // if (rowDetails.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT) {
      //   return null;
      // }

      const { title, description, badgeIcon, createdAt, imageUrl, value } =
        rowDetails.row;
      return (
        <NotificationRow.Root
          handleOnPress={() => onPress(notification)}
          styles={styles}
          simultaneousHandlers={undefined}
        >
          <NotificationRow.Icon
            notificationType={notification.type}
            badgeIcon={badgeIcon}
            imageUrl={imageUrl}
            styles={styles}
          />
          <NotificationRow.Content
            title={title}
            description={description}
            createdAt={createdAt}
            value={value}
            styles={styles}
          />
          {/* TODO - HANDLE FEATURE ANNOUNCEMENT LINKS */}
          {/* {hasActions && (
            <NotificationRow.Actions
              link={notification.data.link}
              action={notification.data.action}
              styles={styles}
            />
          )} */}
        </NotificationRow.Root>
      );
    },
    [onPress, styles],
  );

  const renderList = useCallback(
    (list, idx) => (
      <FlatList
        // This has been ts ignored due the need of extend this component to support injected tabLabel prop.
        // eslint-disable-next-line
        // @ts-ignore
        tabLabel={strings(`notifications.list.${idx.toString()}`)}
        keyExtractor={(_, index) => index.toString()}
        key={combinedLists.indexOf(list)}
        data={list}
        ListEmptyComponent={
          <Empty
            testID={NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER}
          />
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => renderNotificationRow(item)}
        initialNumToRender={10}
        maxToRenderPerBatch={2}
        onEndReachedThreshold={0.5}
      />
    ),
    [combinedLists, renderNotificationRow, styles.list],
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary.default} size="large" />
        </View>
      ) : (
        <ScrollableTabView
          renderTabBar={renderTabBar}
          onChangeTab={onChangeTab}
        >
          {combinedLists.map((list, idx) => renderList(list, idx))}
        </ScrollableTabView>
      )}
    </View>
  );
};

export default Notifications;
