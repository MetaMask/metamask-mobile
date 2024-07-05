import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  formatIsoDateString,
  Notification,
} from '../../../../util/notifications';
import { useTheme } from '../../../../util/theme';

import {
  NavigationProp,
  ParamListBase,
  RouteProp,
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

interface Props {
  navigation: NavigationProp<ParamListBase>;
  route: {
    params: {
      notification: Notification;
    };
  };
}

const NotificationsDetails = ({ route }: Props) => {
  const { notification } = route.params;
  const { markNotificationAsRead } = useMarkNotificationAsRead();
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
          <ModalField key={idx} modalField={field} />
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
}: {
  route: RouteProp<{ params: { notification: Notification } }, 'params'>;
  navigation: NavigationProp<Record<string, undefined>>;
}) => {
  const notification = route?.params?.notification;
  if (!notification) {
    navigation.goBack();
    return {};
  }

  const state =
    NotificationComponentState[notification?.type]?.createModalDetails?.(
      notification,
    );
  if (!state) {
    navigation.goBack();
    return {};
  }

  return {
    // eslint-disable-next-line react/display-name
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
    // eslint-disable-next-line react/display-name
    headerTitle: () => (
      <Header
        title={state.title}
        subtitle={formatIsoDateString(state.createdAt)}
      />
    ),
  };
};
