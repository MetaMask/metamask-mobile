import React, { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './edit-amount.styles';
import AnimatedSpinner, { SpinnerSize } from '../../../../UI/AnimatedSpinner';

export interface EditAmountProps {
  prefix?: string;
}

export function EditAmount({ prefix = '' }: EditAmountProps) {
  const { styles } = useStyles(styleSheet, {});
  const [amountHuman, setAmountHuman] = useState<string>();

  const {
    amountPrecise: transactionAmountHuman,
    pending,
    updateTokenAmount,
  } = useTokenAmount();

  useEffect(() => {
    if (!amountHuman && transactionAmountHuman) {
      setAmountHuman(transactionAmountHuman);
    }
  }, [amountHuman, transactionAmountHuman]);

  const handleChange = useCallback(
    (text: string) => {
      const newAmount = text.replace(prefix, '').trim();
      setAmountHuman(newAmount);
      updateTokenAmount(newAmount);
    },
    [prefix, updateTokenAmount],
  );

  const isFirstLoad = !amountHuman && pending;
  const inputValue = `${prefix}${amountHuman ?? '0'}`;

  return (
    <View style={styles.container}>
      {isFirstLoad ? (
        <AnimatedSpinner size={SpinnerSize.SM} />
      ) : (
        <TextInput
          testID="edit-amount-input"
          value={inputValue}
          onChangeText={handleChange}
          keyboardType="numeric"
          placeholder="Enter amount"
          style={styles.input}
        />
      )}
    </View>
  );
}
