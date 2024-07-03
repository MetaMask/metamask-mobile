import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, FlatListProps, View } from 'react-native';
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
import { NavigationProp, ParamListBase } from '@react-navigation/native';

interface NotificationsListProps {
  navigation: NavigationProp<ParamListBase>;
  allNotifications: Notification[];
  walletNotifications: Notification[];
  web3Notifications: Notification[];
  loading: boolean;
}

interface NotificationsListItemProps {
  navigation: NavigationProp<ParamListBase>;
  notification: Notification;
}

function useStyles() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { colors, styles };
}

function Loading() {
  const { colors, styles } = useStyles();

  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator color={colors.primary.default} size="large" />
    </View>
  );
}

function NotificationsListItem(props: NotificationsListItemProps) {
  const { styles } = useStyles();

  const onNotificationClick = useCallback(
    (item: Notification) =>
      props.navigation.navigate(Routes.NOTIFICATIONS.DETAILS, {
        notification: item,
      }),
    [props.navigation],
  );

  const rowDetails = getRowDetails(props.notification);

  if (!rowDetails) {
    return null;
  }

  // TODO - handle feature announcement component
  if (rowDetails.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT) {
    return null;
  }

  const { title, description, badgeIcon, createdAt, imageUrl, value } =
    rowDetails.row;
  return (
    <NotificationRow.Root
      handleOnPress={() => onNotificationClick(props.notification)}
      styles={styles}
      simultaneousHandlers={undefined}
    >
      <NotificationRow.Icon
        notificationType={props.notification.type}
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
}

function useNotificationListProps(props: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const { styles } = useStyles();

  const getListProps = useCallback(
    (data: Notification[], tabLabel?: string) => {
      const listProps: FlatListProps<Notification> = {
        keyExtractor: (item) => item.id,
        data,
        ListEmptyComponent: (
          <Empty
            testID={NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER}
          />
        ),
        contentContainerStyle: styles.list,
        // eslint-disable-next-line react/display-name, react/prop-types
        renderItem: ({ item }) => (
          <NotificationsListItem
            notification={item}
            // eslint-disable-next-line react/prop-types
            navigation={props.navigation}
          />
        ),
        initialNumToRender: 10,
        maxToRenderPerBatch: 2,
        onEndReachedThreshold: 0.5,
      };

      return { ...listProps, tabLabel: tabLabel ?? '' };
    },
    [props.navigation, styles.list],
  );

  return getListProps;
}

function SingleNotificationList(props: NotificationsListProps) {
  const getListProps = useNotificationListProps(props);

  return <FlatList {...getListProps(props.allNotifications)} />;
}

function TabbedNotificationList(props: NotificationsListProps) {
  const { colors, styles } = useStyles();
  const { trackEvent } = useMetrics();

  const getListProps = useNotificationListProps(props);

  const onTabClick = useCallback(
    (tabLabel: string) => {
      switch (tabLabel) {
        case strings('notifications.list.0'):
          trackEvent(MetaMetricsEvents.ALL_NOTIFICATIONS);
          break;
        case strings('notifications.list.1'):
          trackEvent(MetaMetricsEvents.WALLET_NOTIFICATIONS);
          break;
        case strings('notifications.list.2'):
          trackEvent(MetaMetricsEvents.WEB3_NOTIFICATIONS);
          break;
        default:
          break;
      }
    },
    [trackEvent],
  );

  return (
    <ScrollableTabView
      renderTabBar={(tabProps: TabBarProps<DefaultTabBarProps>) => (
        <View>
          <DefaultTabBar
            underlineStyle={styles.tabUnderlineStyle}
            activeTextColor={colors.primary.default}
            inactiveTextColor={colors.text.default}
            backgroundColor={colors.background.default}
            tabStyle={styles.tabStyle}
            textStyle={styles.textStyle}
            style={styles.tabBar}
            {...tabProps}
          />
        </View>
      )}
      onChangeTab={(val) => onTabClick(val.ref.props.tabLabel)}
    >
      {/* Tab 1 - All Notifications */}
      <FlatList
        {...getListProps(
          props.allNotifications,
          strings(`notifications.list.0`),
        )}
      />

      {/* Tab 2 - Wallet Notifications */}
      <FlatList
        {...getListProps(
          props.allNotifications,
          strings(`notifications.list.1`),
        )}
      />

      {/* Tab 3 - Web 3 Notifications */}
      <FlatList
        {...getListProps(
          props.web3Notifications,
          strings(`notifications.list.2`),
        )}
      />
    </ScrollableTabView>
  );
}

const Notifications = (props: NotificationsListProps) => {
  const { styles } = useStyles();
  if (props.loading) {
    return (
      <View style={styles.container}>
        <Loading />
      </View>
    );
  }

  if (props.web3Notifications.length > 0) {
    return (
      <View style={styles.container}>
        <TabbedNotificationList {...props} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SingleNotificationList {...props} />
    </View>
  );
};

export default Notifications;
