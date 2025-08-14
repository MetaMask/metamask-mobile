import React from 'react';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { useAlerts } from '../../context/alert-system-context';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';
import styleSheet from './alert-message.styles';

export interface AlertMessageProps {
  field?: RowAlertKey;
}

export function AlertMessage({ field }: AlertMessageProps = {}) {
  const { styles } = useStyles(styleSheet, {});
  const { alerts } = useAlerts();
  const filteredAlerts = alerts.filter((a) => !field || a.field === field);

  if (!filteredAlerts.length) {
    return null;
  }

  const message = filteredAlerts[0].message;

  return <Text style={styles.message}>{message}</Text>;
}
