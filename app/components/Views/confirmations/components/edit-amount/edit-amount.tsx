import React, { createRef, useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './edit-amount.styles';
import { useAlerts } from '../../context/alert-system-context';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';
import { EditAmountKeyboard } from '../edit-amount-keyboard';
import { useConfirmationContext } from '../../context/confirmation-context';
import { noop } from 'lodash';
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

  const { amountUnformatted, updateTokenAmount } = useTokenAmount();

  const [amountHuman, setAmountHuman] = useState<number>(
    parseFloat(amountUnformatted ?? '0'),
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
    (amount: number) => {
      setAmountHuman(amount);
      updateTokenAmount(amount.toString());
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

  const displayValue = `${prefix}${amountHuman}`;

  return (
    <View style={styles.container}>
      <TextInput
        testID="edit-amount-input"
        value={displayValue}
        style={styles.input}
        ref={inputRef}
        showSoftInputOnFocus={false}
        onPress={handleInputPress}
      />
      {children}
      {showKeyboard && (
        <EditAmountKeyboard
          value={amountHuman}
          onChange={handleChange}
          onDone={handleKeyboardDone}
          onPercent={noop}
        />
      )}
    </View>
  );
}
