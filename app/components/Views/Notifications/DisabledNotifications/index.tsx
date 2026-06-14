import React from 'react';
import { View } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconColor,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { NotificationsViewSelectorsIDs } from '../NotificationsView.testIds';
import styles from './styles';

interface DisabledNotificationsProps {
  onEnableNotifications: () => void;
}

const DisabledNotifications = ({
  onEnableNotifications,
}: DisabledNotificationsProps) => (
  <View
    style={styles.wrapper}
    testID={NotificationsViewSelectorsIDs.DISABLED_NOTIFICATIONS_CONTAINER}
  >
    <Icon
      name={IconName.Notification}
      size={IconSize.Xl}
      color={IconColor.IconDefault}
      style={styles.icon}
      testID={NotificationsViewSelectorsIDs.DISABLED_NOTIFICATIONS_ICON}
    />
    <Text style={styles.title} variant={TextVariant.HeadingMd}>
      {strings('notifications.disabled.title')}
    </Text>
    <Text style={styles.message} variant={TextVariant.BodyMd}>
      {strings('notifications.disabled.message')}
    </Text>
    <Button
      variant={ButtonVariant.Secondary}
      onPress={onEnableNotifications}
      size={ButtonSize.Lg}
      style={styles.button}
      testID={NotificationsViewSelectorsIDs.ENABLE_NOTIFICATIONS_BUTTON}
    >
      {strings('notifications.disabled.cta')}
    </Button>
  </View>
);

export default DisabledNotifications;
