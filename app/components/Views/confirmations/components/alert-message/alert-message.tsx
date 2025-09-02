import React from 'react';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './alert-message.styles';
import { Alert } from '../../types/alerts';

export interface AlertMessageProps {
  alerts: Alert[];
}

export function AlertMessage({ alerts }: AlertMessageProps) {
  const { styles } = useStyles(styleSheet, {});

  if (!alerts.length) {
    return null;
  }

  const message = alerts[0].message;

  return <Text style={styles.message}>{message}</Text>;
}
