import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import ScrollableTabView, {
  DefaultTabBar,
} from 'react-native-scrollable-tab-view';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import { useTheme } from '../../../../util/theme';
import { createStyles } from './styles';
import { useMetrics } from '../../../hooks/useMetrics';
import Empty from '../Empty';
import { NotificationRow } from '../Row';
import { Notification } from '../../../../util/notifications';

interface NotificationsList {
  navigation: any;
  allNotifications: Notification[];
  walletNotifications: Notification[];
  annoucementsNotifications: Notification[];
  loading: boolean;
}

const Notifications = ({
  navigation,
  allNotifications,
  walletNotifications,
  annoucementsNotifications,
  loading,
}: NotificationsList) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const { trackEvent } = useMetrics();

  const onPress = useCallback(
    (item) => {
      navigation.navigate('NotificationsDetails', { notification: item });
    },
    [navigation],
  );

  const renderTabBar = useCallback(
    (props) => (
      <View style={styles.base}>
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          activeTextColor={colors.primary.default}
          inactiveTextColor={colors.text.default}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          textStyle={styles.textStyle}
          tabPadding={16}
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
    () => [allNotifications, walletNotifications, annoucementsNotifications],
    [allNotifications, walletNotifications, annoucementsNotifications],
  );

  const renderList = useCallback(
    (list, idx) => (
      <FlatList
        // eslint-disable-next-line
        // @ts-ignore
        tabLabel={strings(`notifications.list.${idx.toString()}`)}
        keyExtractor={(_, index) => index.toString()}
        key={combinedLists.indexOf(list)}
        data={list}
        ListEmptyComponent={<Empty />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <NotificationRow.Root
            handleOnPress={() => onPress(item)}
            styles={styles}
          >
            <NotificationRow.Icon
              notificationType={item.type}
              styles={styles}
              badgeIcon={item.badgeIcon}
              imageUri={item.imageUri}
            />
            <NotificationRow.Content
              title={item.title}
              description={item.description}
              createdAt={item.createdAt}
              value={item.value}
              styles={styles}
            />
            <NotificationRow.Actions
              link={item.link}
              action={item.action}
              styles={styles}
              handleCTAPress={() => onPress(item)}
            />
          </NotificationRow.Root>
        )}
        initialNumToRender={10}
        maxToRenderPerBatch={2}
        onEndReachedThreshold={0.5}
      />
    ),
    [combinedLists, onPress, styles],
  );

  return (
    <View style={styles.wrapper}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.icon.default} size="large" />
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
