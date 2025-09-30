import React from 'react';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './alert-message.styles';

export interface AlertMessageProps {
  alertMessage: string | undefined;
}

export function AlertMessage(props: AlertMessageProps) {
  const { alertMessage } = props;
  const { styles } = useStyles(styleSheet, {});

  if (!alertMessage) {
    return null;
  }

  return (
    <Text variant={TextVariant.BodySM} style={styles.message}>
      {alertMessage}
    </Text>
  );
}
