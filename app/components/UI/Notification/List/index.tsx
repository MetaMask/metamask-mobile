import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  FlatListProps,
  Linking,
  View,
} from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import AppConstants from '../../../../core/AppConstants';
import SharedDeeplinkManager from '../../../../core/DeeplinkManager/DeeplinkManager';
import { NotificationsViewSelectorsIDs } from '../../../Views/Notifications/NotificationsView.testIds';
import {
  hasNotificationComponents,
  hasNotificationModal,
  isValidNotificationComponent,
  NotificationComponentState,
} from '../../../../util/notifications/notification-states';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { INotification } from '../../../../util/notifications';
import {
  useListNotifications,
  useMarkNotificationAsRead,
} from '../../../../util/notifications/hooks/useNotifications';
import onChainAnalyticProperties from '../../../../util/notifications/methods/notification-analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import Empty from '../Empty';
import { NotificationMenuItem } from '../NotificationMenuItem';
import useStyles from './useStyles';
import { NotificationMenuViewSelectorsIDs } from '../../../Views/Notifications/NotificationMenuView.testIds';

export const TEST_IDS = {
  loadingContainer: 'notification-list-loading',
};

interface NotificationsListProps {
  navigation: NavigationProp<ParamListBase>;
  allNotifications: INotification[];
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
    <View style={styles.loaderContainer} testID={TEST_IDS.loadingContainer}>
      <ActivityIndicator color={colors.primary.default} size="large" />
    </View>
  );
}

export function useNotificationOnClick(
  props: Pick<NotificationsListItemProps, 'navigation'>,
) {
  const { markNotificationAsRead } = useMarkNotificationAsRead();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleNotificationClickMetricsAndUpdates = useCallback(
    (item: INotification) => {
      markNotificationAsRead([
        {
          id: item.id,
          type: item.type,
          isRead: item.isRead,
        },
      ]);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATION_CLICKED)
          .addProperties({
            notification_id: item.id,
            notification_type: item.type,
            previously_read: item.isRead,
            ...onChainAnalyticProperties(item),
            data: item, // data blob for feature teams to analyse their notification shapes
          })
          .build(),
      );
    },
    [createEventBuilder, markNotificationAsRead, trackEvent],
  );

  const onNavigation = useCallback(
    (item: INotification) => {
      if (hasNotificationModal(item?.type)) {
        props.navigation.navigate(Routes.NOTIFICATIONS.DETAILS, {
          notification: item,
        });
      }
    },
    [props.navigation],
  );

  const onNotificationClick = useCallback(
    (item: INotification) => {
      handleNotificationClickMetricsAndUpdates(item);
      onNavigation(item);
    },
    [handleNotificationClickMetricsAndUpdates, onNavigation],
  );

  return {
    onNotificationClick,
    handleNotificationClickMetricsAndUpdates,
    onNavigation,
  };
}

export function NotificationsListItem(props: NotificationsListItemProps) {
  const { handleNotificationClickMetricsAndUpdates, onNavigation } =
    useNotificationOnClick(props);
  const tw = useTailwind();

  const menuItemState = useMemo(() => {
    const notificationState =
      props.notification?.type &&
      isValidNotificationComponent(props.notification) &&
      hasNotificationComponents(props.notification.type)
        ? NotificationComponentState[props.notification.type]
        : undefined;

    return notificationState?.createMenuItem(props.notification);
  }, [props.notification]);

  const handlePress = useCallback(() => {
    handleNotificationClickMetricsAndUpdates(props.notification);
    const ctaLink = menuItemState?.cta?.link;
    if (ctaLink) {
      try {
        if (ctaLink.includes(AppConstants.MM_IO_UNIVERSAL_LINK_HOST)) {
          SharedDeeplinkManager.parse(ctaLink, {
            origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
          });
        } else {
          Linking.openURL(ctaLink);
        }
      } catch (e) {
        console.warn(`Failed to open NotificationCTA link ${ctaLink}`, e);
      }
    } else {
      onNavigation(props.notification);
    }
  }, [
    handleNotificationClickMetricsAndUpdates,
    menuItemState?.cta?.link,
    onNavigation,
    props.notification,
  ]);

  if (!isValidNotificationComponent(props.notification) || !menuItemState) {
    return null;
  }

  return (
    <NotificationMenuItem.Root
      handleOnPress={handlePress}
      isRead={props.notification.isRead}
      testID={NotificationMenuViewSelectorsIDs.ITEM(props.notification.id)}
      style={tw`gap-2`}
    >
      <Box style={tw`flex-row gap-4`}>
        <NotificationMenuItem.Icon
          isRead={props.notification.isRead}
          {...menuItemState}
        />
        <NotificationMenuItem.Content {...menuItemState} />
      </Box>
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
