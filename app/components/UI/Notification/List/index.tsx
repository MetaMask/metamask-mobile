import { NavigationProp, ParamListBase } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { ActivityIndicator, FlatList, FlatListProps, View } from 'react-native';
import { NotificationsViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/NotificationsView.selectors';
import {
  hasNotificationComponents,
  hasNotificationModal,
  NotificationComponentState,
} from '../../../../util/notifications/notification-states';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { INotification } from '../../../../util/notifications';
import {
  useListNotifications,
  useMarkNotificationAsRead,
} from '../../../../util/notifications/hooks/useNotifications';
import { useMetrics } from '../../../hooks/useMetrics';
import Empty from '../Empty';
import { NotificationMenuItem } from '../NotificationMenuItem';
import useStyles from './useStyles';
import { NotificationMenuViewSelectorsIDs } from '../../../../../e2e/selectors/Notifications/NotificationMenuView.selectors';
interface NotificationsListProps {
  navigation: NavigationProp<ParamListBase>;
  allNotifications: INotification[];
  walletNotifications: INotification[];
  web3Notifications: INotification[];
  loading: boolean;
}

interface NotificationsListItemProps {
  navigation: NavigationProp<ParamListBase>;
  notification: INotification;
}
interface NotificationsListItemProps {
  navigation: NavigationProp<ParamListBase>;
  notification: INotification;
}

function Loading() {
  const {
    theme: { colors },
    styles,
  } = useStyles();

  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator color={colors.primary.default} size="large" />
    </View>
  );
}

export function useNotificationOnClick(
  props: Pick<NotificationsListItemProps, 'navigation'>,
) {
  const { markNotificationAsRead } = useMarkNotificationAsRead();
  const { trackEvent, createEventBuilder } = useMetrics();
  const onNotificationClick = useCallback(
    (item: INotification) => {
      markNotificationAsRead([
        {
          id: item.id,
          type: item.type,
          isRead: item.isRead,
        },
      ]);
      if (hasNotificationModal(item?.type)) {
        props.navigation.navigate(Routes.NOTIFICATIONS.DETAILS, {
          notification: item,
        });
      }

      NotificationsService.getBadgeCount().then((count) => {
        if (count > 0) {
          NotificationsService.decrementBadgeCount(count - 1);
        } else {
          NotificationsService.setBadgeCount(0);
        }
      });

      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATION_CLICKED)
          .addProperties({
            notification_id: item.id,
            notification_type: item.type,
            previously_read: item.isRead,
            ...('chain_id' in item && { chain_id: item.chain_id }),
          })
          .build(),
      );
    },
    [markNotificationAsRead, props.navigation, trackEvent, createEventBuilder],
  );

  return onNotificationClick;
}

export function NotificationsListItem(props: NotificationsListItemProps) {
  const onNotificationClick = useNotificationOnClick(props);

  const menuItemState = useMemo(() => {
    const notificationState =
      props.notification?.type &&
      hasNotificationComponents(props.notification.type)
        ? NotificationComponentState[props.notification.type]
        : undefined;

    return notificationState?.createMenuItem(props.notification);
  }, [props.notification]);

  if (!hasNotificationComponents(props.notification.type) || !menuItemState) {
    return null;
  }

  return (
    <NotificationMenuItem.Root
      handleOnPress={() => onNotificationClick(props.notification)}
      isRead={props.notification.isRead}
      testID={NotificationMenuViewSelectorsIDs.ITEM(props.notification.id)}
    >
      <NotificationMenuItem.Icon
        isRead={props.notification.isRead}
        {...menuItemState}
      />
      <NotificationMenuItem.Content {...menuItemState} />
    </NotificationMenuItem.Root>
  );
}

function useNotificationListProps(props: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const { styles } = useStyles();
  const { listNotifications, isLoading } = useListNotifications();
  const getListProps = useCallback(
    (data: INotification[], tabLabel?: string) => {
      const listProps: FlatListProps<INotification> = {
        keyExtractor: (item: INotification) => item.id,
        data,
        ListEmptyComponent: (
          <Empty
            testID={NotificationsViewSelectorsIDs.NO_NOTIFICATIONS_CONTAINER}
          />
        ),
        contentContainerStyle: styles.list,
        renderItem: ({ item }: { item: INotification }) => (
          <NotificationsListItem
            notification={item}
            navigation={props.navigation}
          />
        ),
        onRefresh: async () => await listNotifications(),
        refreshing: isLoading ?? false,
        initialNumToRender: 10,
        maxToRenderPerBatch: 2,
        onEndReachedThreshold: 0.5,
        testID: NotificationMenuViewSelectorsIDs.ITEM_LIST_SCROLLVIEW,
      };

      return { ...listProps, tabLabel: tabLabel ?? '' };
    },
    [isLoading, listNotifications, props.navigation, styles.list],
  );

  return getListProps;
}

function SingleNotificationList(props: NotificationsListProps) {
  const getListProps = useNotificationListProps(props);

  return <FlatList {...getListProps(props.allNotifications)} />;
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

  return (
    <View style={styles.container}>
      <SingleNotificationList {...props} />
    </View>
  );
};

export default Notifications;
