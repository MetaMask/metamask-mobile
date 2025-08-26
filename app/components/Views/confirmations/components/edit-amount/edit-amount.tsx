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
  children?: (amountHuman: string) => React.ReactNode;
  onKeyboardShow?: () => void;
  onKeyboardHide?: () => void;
  onKeyboardDone?: () => void;
  prefix?: string;
}

export function EditAmount({
  autoKeyboard = false,
  children,
  onKeyboardShow,
  onKeyboardHide,
  onKeyboardDone,
  prefix = '',
}: EditAmountProps) {
  const { fieldAlerts } = useAlerts();
  const alerts = fieldAlerts.filter((a) => a.field === RowAlertKey.Amount);
  const inputRef = createRef<TextInput>();
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [inputChanged, setInputChanged] = useState<boolean>(false);
  const { setIsFooterVisible } = useConfirmationContext();
  const hasAlert = alerts.length > 0 && inputChanged;

  const { styles } = useStyles(styleSheet, {
    hasAlert,
  });

  const { payToken } = useTransactionPayToken();
  const { amountUnformatted, updateTokenAmount } = useTokenAmount();
  const { tokenFiatAmount } = payToken ?? {};

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
      const normalizedAmount = amount.startsWith(prefix)
        ? amount.replace(prefix, '')
        : amount;

      setAmountHuman(normalizedAmount);
    },
    [prefix],
  );

  const handleKeyboardDone = useCallback(() => {
    updateTokenAmount(amountHuman);
    inputRef.current?.blur();
    setInputChanged(true);
    setShowKeyboard(false);
    setIsFooterVisible?.(true);
    onKeyboardHide?.();
    onKeyboardDone?.();
  }, [
    amountHuman,
    inputRef,
    onKeyboardDone,
    onKeyboardHide,
    setIsFooterVisible,
    updateTokenAmount,
  ]);

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      if (!tokenFiatAmount) {
        return;
      }

      const percentageValue = new BigNumber(tokenFiatAmount)
        .multipliedBy(percentage)
        .dividedBy(100);

      handleChange(percentageValue.toString(10));
    },
    [handleChange, tokenFiatAmount],
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
          onChangeText={handleChange}
        />
        {children?.(amountHuman)}
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
