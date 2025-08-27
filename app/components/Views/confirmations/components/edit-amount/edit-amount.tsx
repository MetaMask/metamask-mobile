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
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { getCurrencySymbol } from '../../../../../util/number';
import { useTokenFiatRate } from '../../hooks/tokens/useTokenFiatRates';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { Hex } from '@metamask/utils';

export interface EditAmountProps {
  autoKeyboard?: boolean;
  children?: (amountHuman: string) => React.ReactNode;
  onKeyboardShow?: () => void;
  onKeyboardHide?: () => void;
  onKeyboardDone?: () => void;
}

export function EditAmount({
  autoKeyboard = false,
  children,
  onKeyboardShow,
  onKeyboardHide,
  onKeyboardDone,
}: EditAmountProps) {
  const fiatCurrency = useSelector(selectCurrentCurrency);
  const { fieldAlerts } = useAlerts();
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [inputChanged, setInputChanged] = useState<boolean>(false);
  const { setIsFooterVisible } = useConfirmationContext();
  const { payToken } = useTransactionPayToken();
  const { fiatUnformatted, updateTokenAmount } = useTokenAmount();
  const transactionMeta = useTransactionMetadataRequest();
  const [amountFiat, setAmountFiat] = useState<string>(fiatUnformatted ?? '0');

  const tokenAddress = transactionMeta?.txParams?.to as Hex;
  const chainId = transactionMeta?.chainId as Hex;
  const fiatRate = useTokenFiatRate(tokenAddress, chainId);

  const inputRef = createRef<TextInput>();
  const alerts = fieldAlerts.filter((a) => a.field === RowAlertKey.Amount);
  const hasAlert = alerts.length > 0 && inputChanged;
  const fiatSymbol = getCurrencySymbol(fiatCurrency);

  const { styles } = useStyles(styleSheet, {
    hasAlert,
  });

  const { tokenFiatAmount } = payToken ?? {};
  const hasAmount = amountFiat !== '0';

  const amountHuman = new BigNumber(amountFiat)
    .dividedBy(fiatRate ?? 1)
    .toString(10);

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
      const normalizedAmount = amount.replace(new RegExp(fiatSymbol, 'g'), '');
      setAmountFiat(normalizedAmount);
    },
    [fiatSymbol],
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

  const displayValue = `${fiatSymbol}${amountFiat}`;

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
          value={amountFiat.toString()}
          hasInput={hasAmount}
          onChange={handleChange}
          onDonePress={handleKeyboardDone}
          onPercentagePress={handlePercentagePress}
        />
      )}
    </View>
  );
}
