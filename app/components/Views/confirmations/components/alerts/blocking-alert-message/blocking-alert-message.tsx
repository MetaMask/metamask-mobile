import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { useAlerts } from '../../../context/alert-system-context';
import styleSheet from './blocking-alert-message.styles';

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
        <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
          {blockingAlertMessage}
        </Text>
      ) : (
        blockingAlertMessage
      )}
    </View>
  );
});
