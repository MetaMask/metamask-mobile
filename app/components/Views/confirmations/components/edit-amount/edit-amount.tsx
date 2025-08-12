import React, { createRef, useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './edit-amount.styles';
import { useAlerts } from '../../context/alert-system-context';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';
import { DepositKeyboard } from '../deposit-keyboard';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import { BigNumber } from 'bignumber.js';

export interface EditAmountProps {
  autoKeyboard?: boolean;
  children?: React.ReactNode;
  onKeyboardShow?: () => void;
  onKeyboardHide?: () => void;
  prefix?: string;
}

export function EditAmount({
  autoKeyboard = false,
  children,
  onKeyboardShow,
  onKeyboardHide,
  prefix = '',
}: EditAmountProps) {
  const { fieldAlerts } = useAlerts();
  const alerts = fieldAlerts.filter((a) => a.field === RowAlertKey.Amount);
  const hasAlert = alerts.length > 0;
  const inputRef = createRef<TextInput>();
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [inputChanged, setInputChanged] = useState<boolean>(false);
  const { setIsFooterVisible } = useConfirmationContext();

  const { styles } = useStyles(styleSheet, {
    hasAlert,
  });

  const { balanceFiat } = useTransactionPayToken();
  const { amountUnformatted, updateTokenAmount } = useTokenAmount();

  const [amountHuman, setAmountHuman] = useState<string>(
    amountUnformatted ?? '0',
  );

  const handleInputPress = useCallback(() => {
    inputRef.current?.focus();
    setShowKeyboard(true);
    setIsFooterVisible?.(false);
    onKeyboardShow?.();
  }, [inputRef, onKeyboardShow, setIsFooterVisible]);

  useEffect(() => {
    if (autoKeyboard && !inputChanged) {
      handleInputPress();
    }
  }, [autoKeyboard, inputChanged, handleInputPress]);

  const handleChange = useCallback(
    (amount: string) => {
      setAmountHuman(amount);
      updateTokenAmount(amount);
    },
    [updateTokenAmount],
  );

  const handleKeyboardDone = useCallback(() => {
    inputRef.current?.blur();
    setInputChanged(true);
    setShowKeyboard(false);
    setIsFooterVisible?.(true);
    onKeyboardHide?.();
  }, [inputRef, onKeyboardHide, setIsFooterVisible]);

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      if (!balanceFiat) {
        return;
      }

      const percentageValue = new BigNumber(balanceFiat)
        .multipliedBy(percentage)
        .dividedBy(100);

      handleChange(percentageValue.toString(10));
    },
    [balanceFiat, handleChange],
  );

  const displayValue = `${prefix}${amountHuman}`;

  return (
    <View style={styles.container}>
      <View style={styles.primaryContainer}>
        <TextInput
          testID="edit-amount-input"
          value={displayValue}
          style={styles.input}
          ref={inputRef}
          showSoftInputOnFocus={false}
          onPress={handleInputPress}
        />
        {children}
      </View>
      {showKeyboard && (
        <DepositKeyboard
          value={amountHuman.toString()}
          onChange={handleChange}
          onDonePress={handleKeyboardDone}
          onPercentagePress={handlePercentagePress}
        />
      )}
    </View>
  );
}
