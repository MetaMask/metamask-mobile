import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../../component-library/components/Icons/Icon';
import Input from '../../../../../../../component-library/components/Form/TextField/foundation/Input';
import TagBase, {
  TagShape,
} from '../../../../../../../component-library/base-components/TagBase';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { selectPrimaryCurrency } from '../../../../../../../selectors/settings';
import { useStyles } from '../../../../../../hooks/useStyles';
import { formatToFixedDecimals } from '../../../../utils/send';
import { useAmountValidation } from '../../../../hooks/send/useAmountValidation';
import { useCurrencyConversions } from '../../../../hooks/send/useCurrencyConversions';
import { useMaxAmount } from '../../../../hooks/send/useMaxAmount';
import { useSendContext } from '../../../../context/send-context';
import { styleSheet } from './amount-edit.styles';

export const AmountEdit = () => {
  const { asset, updateValue } = useSendContext();
  const { balance, isMaxAmountSupported, maxAmount } = useMaxAmount();
  const [amount, updateAmount] = useState('');
  const { insufficientBalance } = useAmountValidation();
  const primaryCurrency = useSelector(selectPrimaryCurrency);
  const [fiatMode, setFiatMode] = useState(primaryCurrency === 'Fiat');
  const {
    fiatCurrencySymbol,
    getFiatDisplayValue,
    getFiatValue,
    getNativeDisplayValue,
    getNativeValue,
  } = useCurrencyConversions();
  const { styles, theme } = useStyles(styleSheet, {
    inputError: insufficientBalance ?? false,
  });

  useEffect(() => {
    setFiatMode(primaryCurrency === 'Fiat');
  }, [primaryCurrency, setFiatMode]);

  const alternateDisplayValue = useMemo(
    () =>
      fiatMode ? getNativeDisplayValue(amount) : getFiatDisplayValue(amount),
    [amount, fiatMode, getFiatDisplayValue, getNativeDisplayValue],
  );

  const updateToMaxAmount = useCallback(() => {
    if (maxAmount !== undefined) {
      updateAmount(fiatMode ? getFiatValue(maxAmount).toString() : maxAmount);
      updateValue(maxAmount);
    }
  }, [fiatMode, getFiatValue, maxAmount, updateAmount, updateValue]);

  const updateToNewAmount = useCallback(
    (amt: string) => {
      updateAmount(amt);
      updateValue(fiatMode ? getNativeValue(amt) : amt);
    },
    [fiatMode, getNativeValue, updateAmount, updateValue],
  );

  const toggleFiatMode = useCallback(() => {
    setFiatMode(!fiatMode);
    updateAmount('');
    updateValue('');
  }, [fiatMode, setFiatMode, updateAmount, updateValue]);

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
            color={
              insufficientBalance ? TextColor.Error : TextColor.Alternative
            }
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
      {isMaxAmountSupported && (
        <Button
          label="Max"
          onPress={updateToMaxAmount}
          variant={ButtonVariants.Secondary}
        />
      )}
    </View>
  );
};
