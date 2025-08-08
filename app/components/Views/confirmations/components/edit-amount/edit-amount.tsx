import React, { useCallback, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './edit-amount.styles';
import { useAlerts } from '../../context/alert-system-context';
import Text from '../../../../../component-library/components/Texts/Text';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';

export interface EditAmountProps {
  children?: React.ReactNode;
  prefix?: string;
}

export function EditAmount({ children, prefix = '' }: EditAmountProps) {
  const { fieldAlerts } = useAlerts();
  const alerts = fieldAlerts.filter((a) => a.field === RowAlertKey.Amount);
  const hasAlert = alerts.length > 0;
  const alertMessage = alerts[0]?.message;

  const { styles } = useStyles(styleSheet, {
    hasAlert,
  });

  const { amountPrecise: transactionAmountHuman, updateTokenAmount } =
    useTokenAmount();

  const [amountHuman, setAmountHuman] = useState<string | undefined>(
    transactionAmountHuman,
  );

  const handleChange = useCallback(
    (text: string) => {
      const newAmount = text.replace(prefix, '').trim();
      setAmountHuman(newAmount);
      updateTokenAmount(newAmount);
    },
    [prefix, updateTokenAmount],
  );

  const inputValue = `${prefix}${amountHuman}`;

  return (
    <View style={styles.container}>
      <TextInput
        testID="edit-amount-input"
        value={inputValue}
        onChangeText={handleChange}
        keyboardType="numeric"
        style={styles.input}
      />
      {children}
      {hasAlert ? <Text style={styles.alert}>{alertMessage}</Text> : null}
    </View>
  );
}
