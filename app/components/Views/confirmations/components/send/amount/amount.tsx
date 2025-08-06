import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { selectPrimaryCurrency } from '../../../../../../selectors/settings';
import { useStyles } from '../../../../../hooks/useStyles';
import { useAmountValidation } from '../../../hooks/send/useAmountValidation';
import { useConversions } from '../../../hooks/send/useConversions';
import { useMaxAmount } from '../../../hooks/send/useMaxAmount';
import { useSendContext } from '../../../context/send-context';
import { styleSheet } from './amount.styles';

export const Amount = () => {
  const { styles } = useStyles(styleSheet, {});
  const { updateValue } = useSendContext();
  const { getMaxAmount, isMaxAmountSupported } = useMaxAmount();
  const [amount, updateAmount] = useState('');
  const { amountError } = useAmountValidation();
  const primaryCurrency = useSelector(selectPrimaryCurrency);
  const [fiatMode, setFiatMode] = useState(primaryCurrency === 'Fiat');
  const {
    getFiatDisplayValue,
    getFiatValue,
    getNativeDisplayValue,
    getNativeValue,
  } = useConversions();

  useEffect(() => {
    setFiatMode(primaryCurrency === 'Fiat');
  }, [primaryCurrency, setFiatMode]);

  const alternateDisplayValue = useMemo(
    () =>
      fiatMode ? getNativeDisplayValue(amount) : getFiatDisplayValue(amount),
    [amount, fiatMode, getFiatDisplayValue, getNativeDisplayValue],
  );

  const updateToMaxAmount = useCallback(() => {
    const maxAmount = getMaxAmount();
    if (maxAmount !== undefined) {
      updateAmount(fiatMode ? getFiatValue(maxAmount).toString() : maxAmount);
      updateValue(maxAmount);
    }
  }, [fiatMode, getFiatValue, getMaxAmount, updateAmount, updateValue]);

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

  return (
    <View>
      <Text>Value:</Text>
      <Input
        style={styles.input}
        value={amount}
        onChangeText={updateToNewAmount}
        testID="send_amount"
      />
      <Text>{fiatMode ? 'Native value' : 'Fiat value'}:</Text>
      <Text>{alternateDisplayValue}</Text>
      <Button
        label={fiatMode ? 'Native mode' : 'Fiat mode'}
        onPress={toggleFiatMode}
        variant={ButtonVariants.Secondary}
        testID="fiat_toggle"
      />
      <Text color={TextColor.Error}>{amountError}</Text>
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
