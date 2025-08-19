import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import TagBase, {
  TagShape,
} from '../../../../../../component-library/base-components/TagBase';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectPrimaryCurrency } from '../../../../../../selectors/settings';
import { useStyles } from '../../../../../hooks/useStyles';
import { formatToFixedDecimals } from '../../../utils/send';
import { useAmountSelectionMetrics } from '../../../hooks/send/metrics/useAmountSelectionMetrics';
import { useAmountValidation } from '../../../hooks/send/useAmountValidation';
import { useBalance } from '../../../hooks/send/useBalance';
import { useCurrencyConversions } from '../../../hooks/send/useCurrencyConversions';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import { useSendContext } from '../../../context/send-context';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
import { AmountKeyboard } from './amount-keyboard';
import { styleSheet } from './amount.styles';

export const Amount = () => {
  const primaryCurrency = useSelector(selectPrimaryCurrency);
  const { asset, updateValue } = useSendContext();
  const { balance } = useBalance();
  const { amountError } = useAmountValidation();
  const [amount, setAmount] = useState('');
  const [fiatMode, setFiatMode] = useState(primaryCurrency === 'Fiat');
  const {
    fiatCurrencySymbol,
    getFiatDisplayValue,
    getNativeDisplayValue,
    getNativeValue,
  } = useCurrencyConversions();
  const { styles, theme } = useStyles(styleSheet, {
    inputError: Boolean(amountError),
    inputLength: amount.length,
  });
  const {
    setAmountInputMethodManual,
    setAmountInputTypeFiat,
    setAmountInputTypeToken,
  } = useAmountSelectionMetrics();
  useRouteParams();
  useSendNavbar({ currentRoute: Routes.SEND.AMOUNT });

  useEffect(() => {
    setFiatMode(primaryCurrency === 'Fiat');
  }, [primaryCurrency, setFiatMode]);

  const alternateDisplayValue = useMemo(
    () =>
      fiatMode ? getNativeDisplayValue(amount) : getFiatDisplayValue(amount),
    [amount, fiatMode, getFiatDisplayValue, getNativeDisplayValue],
  );

  const updateToNewAmount = useCallback(
    (amt: string) => {
      setAmount(amt);
      updateValue(fiatMode ? getNativeValue(amt) : amt);
      setAmountInputMethodManual();
    },
    [
      fiatMode,
      getNativeValue,
      setAmount,
      setAmountInputMethodManual,
      updateValue,
    ],
  );

  const toggleFiatMode = useCallback(() => {
    if (!fiatMode) {
      setAmountInputTypeToken();
    } else {
      setAmountInputTypeFiat();
    }
    setFiatMode(!fiatMode);
    setAmount('');
    updateValue('');
  }, [
    fiatMode,
    setAmount,
    setAmountInputTypeFiat,
    setAmountInputTypeToken,
    setFiatMode,
    updateValue,
  ]);

  const assetSymbol = asset?.ticker ?? asset?.symbol;

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Input
              cursorColor={theme.colors.primary.default}
              onChangeText={updateToNewAmount}
              style={styles.input}
              testID="send_amount"
              textAlign="right"
              textVariant={TextVariant.DisplayLG}
              value={amount}
            />
          </View>
          <Text
            color={amountError ? TextColor.Error : TextColor.Alternative}
            style={styles.tokenSymbol}
            variant={TextVariant.DisplayLG}
          >
            {fiatMode ? fiatCurrencySymbol : assetSymbol}
          </Text>
        </View>
        <TagBase shape={TagShape.Pill} style={styles.currencyTag}>
          <Text color={TextColor.Alternative}>{alternateDisplayValue}</Text>
          <ButtonIcon
            iconColor={IconColor.Alternative}
            iconName={IconName.SwapVertical}
            onPress={toggleFiatMode}
            testID="fiat_toggle"
          />
        </TagBase>
        <View style={styles.balanceSection}>
          <Text color={TextColor.Alternative}>{`${formatToFixedDecimals(
            balance,
            asset?.decimals,
          )} ${assetSymbol} ${strings('send.available')}`}</Text>
        </View>
      </View>
      <AmountKeyboard
        amount={amount}
        fiatMode={fiatMode}
        updateAmount={setAmount}
      />
    </View>
  );
};
