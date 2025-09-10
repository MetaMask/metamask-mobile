import React, { createRef, useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './edit-amount.styles';
import { DepositKeyboard } from '../deposit-keyboard';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import { BigNumber } from 'bignumber.js';
import { getCurrencySymbol } from '../../../../../util/number';
import { useTokenFiatRate } from '../../hooks/tokens/useTokenFiatRates';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { Hex } from '@metamask/utils';
import { Alert } from '../../types/alerts';
import { PERPS_CURRENCY } from '../../constants/perps';
import { AlertKeys } from '../../constants/alerts';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

const MAX_LENGTH = 28;

export interface EditAmountProps {
  alerts?: Alert[];
  autoKeyboard?: boolean;
  children?: (amountHuman: string) => React.ReactNode;
  onChange?: (amount: string) => void;
  onKeyboardShow?: () => void;
  onKeyboardHide?: () => void;
  onKeyboardDone?: () => void;
}

export function EditAmount({
  alerts,
  autoKeyboard = false,
  children,
  onChange,
  onKeyboardShow,
  onKeyboardHide,
  onKeyboardDone,
}: EditAmountProps) {
  const fiatCurrency = PERPS_CURRENCY;
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [inputChanged, setInputChanged] = useState<boolean>(false);
  const { setIsFooterVisible } = useConfirmationContext();
  const { payToken } = useTransactionPayToken();
  const { updateTokenAmount } = useTokenAmount();
  const transactionMeta = useTransactionMetadataRequest();
  const [amountFiat, setAmountFiat] = useState<string>('0');

  const tokenAddress = transactionMeta?.txParams?.to as Hex;
  const chainId = transactionMeta?.chainId as Hex;
  const fiatRate = useTokenFiatRate(tokenAddress, chainId, fiatCurrency);

  const inputRef = createRef<TextInput>();
  const fiatSymbol = getCurrencySymbol(fiatCurrency);
  const amountLength = amountFiat.length;
  const currentAlert = alerts?.[0];

  const hasAlert =
    inputChanged || currentAlert?.key === AlertKeys.PerpsHardwareAccount;

  const alertKeyboard = hasAlert
    ? currentAlert?.title ?? (currentAlert?.message as string)
    : undefined;

  const alertMessage = hasAlert ? currentAlert?.message : undefined;

  const { styles } = useStyles(styleSheet, {
    amountLength,
    hasAlert,
  });

  const { tokenFiatAmount } = payToken ?? {};
  const hasAmount = amountFiat !== '0';

  const amountHuman = new BigNumber(amountFiat.replace(/,/g, ''))
    .dividedBy(fiatRate ?? 1)
    .toString(10);

  const handleInputPress = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.setSelection(amountFiat.length, amountFiat.length);

    setShowKeyboard(true);
    setIsFooterVisible?.(false);

    onKeyboardShow?.();
  }, [amountFiat, inputRef, onKeyboardShow, setIsFooterVisible]);

  useEffect(() => {
    if (autoKeyboard && !inputChanged) {
      handleInputPress();
    }
  }, [autoKeyboard, inputChanged, handleInputPress]);

  const handleChange = useCallback((amount: string) => {
    const newAmount = amount.replace(/^0+/, '') || '0';

    if (newAmount.length >= MAX_LENGTH) {
      return;
    }

    setAmountFiat(newAmount);
    setInputChanged(true);
  }, []);

  useEffect(() => {
    if (!inputChanged) {
      return;
    }
    onChange?.(amountHuman);
  }, [amountHuman, inputChanged, onChange]);

  const handleKeyboardDone = useCallback(() => {
    updateTokenAmount(amountHuman);
    inputRef.current?.blur();
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
        .dividedBy(100)
        .decimalPlaces(2, BigNumber.ROUND_HALF_UP);

      handleChange(percentageValue.toString(10));
    },
    [handleChange, tokenFiatAmount],
  );

  return (
    <View style={styles.container}>
      <View style={styles.primaryContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            defaultValue={fiatSymbol}
            editable={false}
          />
          <TextInput
            testID="edit-amount-input"
            style={styles.input}
            ref={inputRef}
            defaultValue={amountFiat}
            showSoftInputOnFocus={false}
            onPress={handleInputPress}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={MAX_LENGTH}
          />
        </View>
        {children?.(amountHuman)}
        {showKeyboard && alertMessage && (
          <Text variant={TextVariant.BodySM} style={styles.alertMessage}>
            {alertMessage}
          </Text>
        )}
      </View>
      {showKeyboard && (
        <DepositKeyboard
          alertMessage={alertKeyboard}
          value={amountFiat}
          hasInput={hasAmount}
          onChange={handleChange}
          onDonePress={handleKeyboardDone}
          onPercentagePress={handlePercentagePress}
        />
      )}
    </View>
  );
}
