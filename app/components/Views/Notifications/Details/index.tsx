/* eslint-disable react/display-name */
import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useDispatch, useSelector } from 'react-redux';

import {
  Notification,
  TRIGGER_TYPES,
  formatDate,
  formatNotificationTitle,
} from '../../../../util/notifications';

import { useTheme } from '../../../../util/theme';

import ClipboardManager from '../../../../core/ClipboardManager';
import { strings } from '../../../../../locales/i18n';

import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

import { showAlert } from '../../../../actions/alert';
import { protectWalletModalVisible } from '../../../../actions/user';
import { useMarkNotificationAsRead } from '../../../../util/notifications/hooks/useNotifications';
import { createStyles } from './styles';

import renderAnnouncementsDetails from './Announcements';
import renderOnChainDetails from './OnChain';
import Header from './Header';
import type { RootState } from '../../../../reducers';
import { NavigationProp, RouteProp } from '@react-navigation/native';

interface Props {
  navigation: NavigationProp<Record<string, undefined>>;
  route: {
    params: {
      notification: Notification;
    };
  };
}

const NotificationsDetails = ({ navigation, route }: Props) => {
  const { notification } = route.params;
  const { markNotificationAsRead } = useMarkNotificationAsRead();
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = createStyles(theme);

  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  useEffect(() => {
    if (!notification.isRead) {
      markNotificationAsRead([
        {
          id: notification.id,
          type: notification.type,
          isRead: notification.isRead,
        },
      ]);
    }
  }, [notification, markNotificationAsRead]);

  const handleShowAlert = (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config));

  const handleProtectWalletModalVisible = () =>
    dispatch(protectWalletModalVisible());

  const copyToClipboard = async (type: string, selectedString?: string) => {
    if (!selectedString) return;
    await ClipboardManager.setString(selectedString);
    handleShowAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: {
        msg:
          type === 'address'
            ? strings('notifications.address_copied_to_clipboard')
            : strings('notifications.transaction_id_copied_to_clipboard'),
      },
    });
    setTimeout(() => handleProtectWalletModalVisible(), 2000);
  };

  return (
    <ScrollView contentContainerStyle={styles.contentContainerWrapper}>
      {notification.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT
        ? renderAnnouncementsDetails({ notification, styles, navigation })
        : renderOnChainDetails({
            notification,
            styles,
            theme,
            accountAvatarType,
            navigation,
            copyToClipboard,
          })}
    </ScrollView>
  );
};

export default NotificationsDetails;

NotificationsDetails.navigationOptions = ({
  route,
  navigation,
}: {
  route: RouteProp<{ params: { notification: Notification } }, 'params'>;
  navigation: NavigationProp<Record<string, undefined>>;
}) => ({
  headerLeft: () => (
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Icon
        name={IconName.ArrowLeft}
        size={IconSize.Md}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ marginLeft: 16 }}
      />
    </TouchableOpacity>
  ),
  headerTitle: () => (
    <Header
      title={
        route.params.notification.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT
          ? route.params.notification.data.title
          : // TODO - Provide better title for other notifications
            // E.g. "eth_sent" is not just eth. It is native token sent
            formatNotificationTitle(route.params.notification.type)
      }
      subtitle={formatDate(route.params.notification.createdAt)}
    />
  ),
});
