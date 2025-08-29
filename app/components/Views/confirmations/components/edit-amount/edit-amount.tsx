import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './edit-amount.styles';
import { useAlerts } from '../../context/alert-system-context';
import { RowAlertKey } from '../UI/info-row/alert-row/constants';
import { DepositKeyboard } from '../deposit-keyboard';
import { useConfirmationContext } from '../../context/confirmation-context';
import { BigNumber } from 'bignumber.js';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { getCurrencySymbol } from '../../../../../util/number';
import { useTokenFiatRate } from '../../hooks/tokens/useTokenFiatRates';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { Hex } from '@metamask/utils';
import { setPendingTokenAmount } from '../../../../../core/redux/slices/confirmationMetrics';
import { usePayContext } from '../../context/pay-context/pay-context';
import { profiler } from './profiler';
import Text from '../../../../../component-library/components/Texts/Text';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';

const MAX_LENGTH = 28;

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
  const dispatch = useDispatch();
  const fiatCurrency = useSelector(selectCurrentCurrency);
  const { fieldAlerts } = useAlerts();
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [inputChanged, setInputChanged] = useState<boolean>(false);
  const { setIsFooterVisible } = useConfirmationContext();
  const { payToken } = usePayContext();
  // const { fiatUnformatted, updateTokenAmount } = useTokenAmount();
  const transactionMeta = useTransactionMetadataRequest();
  const [amountFiat, setAmountFiat] = useState<string>('0');

  const tokenAddress = transactionMeta?.txParams?.to as Hex;
  const chainId = transactionMeta?.chainId as Hex;
  const fiatRate = useTokenFiatRate(tokenAddress, chainId);

  const alerts = fieldAlerts.filter((a) => a.field === RowAlertKey.Amount);
  const hasAlert = alerts.length > 0 && inputChanged;
  const fiatSymbol = getCurrencySymbol(fiatCurrency);
  const amountLength = amountFiat.length;

  const { styles } = useStyles(styleSheet, {
    amountLength,
    hasAlert,
  });

  const { tokenFiatAmount } = payToken ?? {};
  const hasAmount = amountFiat !== '0';

  const amountHuman = new BigNumber(amountFiat.replace(/,/g, '.'))
    .dividedBy(fiatRate ?? 1)
    .toString(10);

  const handleInputPress = useCallback(() => {
    setShowKeyboard(true);
    setIsFooterVisible?.(false);
    onKeyboardShow?.();
  }, [onKeyboardShow, setIsFooterVisible]);

  useEffect(() => {
    if (autoKeyboard && !inputChanged) {
      handleInputPress();
    }
  }, [autoKeyboard, inputChanged, handleInputPress]);

  const handleChange = useCallback((amount: string) => {
    if (amount.length >= MAX_LENGTH) {
      return;
    }

    setAmountFiat(amount);
  }, []);

  useAsyncResult(async () => {
    profiler.start('dispatch');
    dispatch(setPendingTokenAmount(amountHuman));
    profiler.stop('dispatch');
  }, [dispatch, amountHuman]);

  const handleKeyboardDone = useCallback(() => {
    profiler.log();
    profiler.reset();

    //updateTokenAmount(amountHuman);
    setInputChanged(true);
    setShowKeyboard(false);
    setIsFooterVisible?.(true);
    onKeyboardHide?.();
    onKeyboardDone?.();
  }, [onKeyboardDone, onKeyboardHide, setIsFooterVisible]);

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
          <Text
            testID="edit-amount-input"
            style={styles.input}
            onPress={handleInputPress}
          >
            {amountFiat}
          </Text>
        </View>
        {children?.(amountHuman)}
      </View>
      {showKeyboard && (
        <DepositKeyboard
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
