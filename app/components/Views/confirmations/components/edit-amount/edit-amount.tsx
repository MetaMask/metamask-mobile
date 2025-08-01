import React, { useCallback, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './edit-amount.styles';

export interface EditAmountProps {
  prefix?: string;
}

export function EditAmount({ prefix = '' }: EditAmountProps) {
  const { styles } = useStyles(styleSheet, {});

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
    </View>
  );
}
