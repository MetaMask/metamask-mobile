import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Notification } from '../../../../util/notifications';
import { useTheme } from '../../../../util/theme';

import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { useMarkNotificationAsRead } from '../../../../util/notifications/hooks/useNotifications';
import { NotificationComponentState } from '../../../../util/notifications/notification-states';
import Header from './Title';
import { createStyles } from './styles';
import ModalField from './Fields';
import ModalHeader from './Headers';
import ModalFooter from './Footers';
import { toLocaleDate } from '../../../../util/date';

interface Props {
  navigation: NavigationProp<ParamListBase>;
  route: {
    params: {
      notification: Notification;
    };
  };
}

const NotificationsDetails = ({ route, navigation }: Props) => {
  const { notification } = route.params;
  const { markNotificationAsRead } = useMarkNotificationAsRead();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const theme = useTheme();
  const styles = createStyles(theme);

  // Effect - Mark As Read, on open
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

  const state =
    NotificationComponentState[notification?.type]?.createModalDetails?.(
      notification,
    );

  const HeaderLeft = useCallback(
    () => (
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Md}
          style={styles.backIcon}
        />
      </TouchableOpacity>
    ),
    [navigation, styles.backIcon],
  );

  const HeaderTitle = useCallback(
    () => (
      <Header
        title={state?.title || ''}
        subtitle={toLocaleDate(state?.createdAt)}
      />
    ),
    [state?.title, state?.createdAt],
  );

  useEffect(() => {
    navigation.setOptions({
      headerLeft: HeaderLeft,
      headerTitle: HeaderTitle,
    });
  });

  if (!state) {
    return null;
  }
  return (
    <ScrollView contentContainerStyle={styles.contentContainerWrapper}>
      <View style={styles.renderContainer}>
        {/* Modal Headers */}
        {state.header && <ModalHeader modalHeader={state.header} />}

        {/* Modal Fields */}
        {state.fields.map((field, idx) => (
          <ModalField
            key={idx}
            modalField={field}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
          />
        ))}

        {/* Modal Footers */}
        {state.footer && <ModalFooter modalFooter={state.footer} />}
      </View>
    </ScrollView>
  );
};

export default NotificationsDetails;
