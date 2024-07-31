import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Notification } from '../../../../util/notifications';
import { useTheme } from '../../../../util/theme';

import {
  NavigationProp,
  RouteProp,
  useNavigation,
} from '@react-navigation/native';
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
import { NotificationModalDetails } from '../../../../util/notifications/notification-states/types/NotificationModalDetails';
import { toLocaleDate } from '../../../../util/date';

interface Props {
  route: {
    params: {
      notification: Notification;
    };
  };
}

const NotificationsDetails = ({ route }: Props) => {
  const navigation = useNavigation();
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

  // Only use useCallback here if the state.title is most likely always the same, if not, it is unnecessary to memoize it
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

NotificationsDetails.navigationOptions = ({
  route,
  navigation,
  state,
}: {
  route: RouteProp<{ params: { notification: Notification } }, 'params'>;
  navigation: NavigationProp<Record<string, undefined>>;
  state: NotificationModalDetails;
}) => {
  const notification = route?.params?.notification;
  if (!notification) {
    navigation.goBack();
    return {};
  }

  if (!state) {
    navigation.goBack();
    return {};
  }
};
