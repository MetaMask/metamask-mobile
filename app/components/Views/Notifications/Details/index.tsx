import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  INotification,
  isNotificationsFeatureEnabled,
} from '../../../../util/notifications';
import { useTheme } from '../../../../util/theme';

import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { useMarkNotificationAsRead } from '../../../../util/notifications/hooks/useNotifications';
import {
  hasNotificationComponents,
  NotificationComponentState,
} from '../../../../util/notifications/notification-states';
import Header from './Title';
import { createStyles } from './styles';
import ModalField from './Fields';
import ModalHeader from './Headers';
import ModalFooter from './Footers';
import { toLocaleDate } from '../../../../util/date';
import { NotificationDetailsViewSelectorsIDs } from '../../../../../e2e/selectors/Notifications/NotificationDetailsView.selectors';

interface Props {
  navigation: NavigationProp<ParamListBase>;
  route: {
    params: {
      notification: INotification;
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
    notification?.type && hasNotificationComponents(notification.type)
      ? NotificationComponentState[notification.type]?.createModalDetails?.(
          notification,
        )
      : undefined;

  const HeaderLeft = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        testID={NotificationDetailsViewSelectorsIDs.BACK_BUTTON}
      >
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
        title={state?.title ?? ''}
        subtitle={toLocaleDate(state?.createdAt)}
      />
    ),
    [state?.title, state?.createdAt],
  );

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  });

  const insets = useSafeAreaInsets();

  if (!state) {
    return null;
  }

  return (
    <View style={styles.modalContainer}>
      {/* Header */}
      <View
        style={[
          styles.navContainer,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <HeaderLeft />
        <HeaderTitle />
      </View>

      {/* Body */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          {/* Modal Headers */}
          {state.header && <ModalHeader modalHeader={state.header} />}

          {/* Modal Fields */}
          {state.fields.map((field, idx) => (
            <ModalField
              key={idx}
              modalField={field}
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              notification={notification}
            />
          ))}
        </View>

        {/* Modal Footers */}
        {state.footer && (
          <View style={styles.footerContainer}>
            <ModalFooter
              modalFooter={state.footer}
              notification={notification}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const NotificationDetailsContainer = (props: Props) => {
  if (!isNotificationsFeatureEnabled()) {
    return null;
  }

  return <NotificationsDetails {...props} />;
};

export default NotificationDetailsContainer;
