import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import { useAlerts } from '../../../context/alert-system-context';
import styleSheet from './blocking-alert-message.styles';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

/**
 * Renders the first blocking alert message from the alert context.
 */
export const BlockingAlertMessage: React.FC = React.memo(() => {
  const { alerts } = useAlerts();
  const { styles } = useStyles(styleSheet, {});

  const blockingAlertMessage = alerts.find(
    (confirmationAlert) => confirmationAlert.isBlocking,
  )?.message;

  if (!blockingAlertMessage) {
    return null;
  }

  return (
    <View style={styles.container}>
      {typeof blockingAlertMessage === 'string' ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.ErrorDefault}
          style={styles.message}
        >
          {blockingAlertMessage}
        </Text>
      ) : (
        blockingAlertMessage
      )}
    </View>
  );
});
