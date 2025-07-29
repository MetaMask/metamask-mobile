import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../../../component-library/components/Checkbox/Checkbox';
import Input from '../../../../../../component-library/components/Form/TextField/foundation/Input';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { selectPrimaryCurrency } from '../../../../../../selectors/settings';
import { useStyles } from '../../../../../hooks/useStyles';
import useAmountValidation from '../../../hooks/send/useAmountValidation';
import useConversions from '../../../hooks/send/useConversions';
import useMaxAmount from '../../../hooks/send/useMaxAmount';
import { useSendContext } from '../../../context/send-context';
import styleSheet from './amount.styles';

const Amount = () => {
  const { styles } = useStyles(styleSheet, {});
  const { updateValue } = useSendContext();
  const { getMaxAmount } = useMaxAmount();
  const [amount, updateAmount] = useState('');
  const [fiatMode, setFiatMode] = useState(false);
  const { amountError } = useAmountValidation();
  const primaryCurrency = useSelector(selectPrimaryCurrency) ?? 'ETH';
  const {
    getFiatDisplayValue,
    getFiatValue,
    getNativeDisplayValue,
    getNativeValue,
  } = useConversions();

  useEffect(() => {
    if (primaryCurrency === 'Fiat') {
      setFiatMode(true);
    }
  }, [primaryCurrency, setFiatMode]);

  const alternateDisplayValue = useMemo(
    () =>
      fiatMode ? getNativeDisplayValue(amount) : getFiatDisplayValue(amount),
    [amount, fiatMode],
  );

  const updateToMaxAmount = useCallback(() => {
    const maxAmount = getMaxAmount();
    updateAmount(fiatMode ? getFiatValue(maxAmount).toString() : maxAmount);
    updateValue(maxAmount);
  }, [fiatMode, getMaxAmount, updateValue]);

  const updateToNewAmount = useCallback(
    (amount: string) => {
      updateAmount(amount);
      updateValue(fiatMode ? getNativeValue(amount).toString() : amount);
    },
    [getMaxAmount, updateValue],
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
      <Text>
        {fiatMode ? 'Native value' : 'Fiat value'}: {alternateDisplayValue}
      </Text>
      <Checkbox
        label="Fiat mode"
        isChecked={fiatMode}
        onPressIn={toggleFiatMode}
      />
      <Text color={TextColor.Error}>{amountError}</Text>
      <Button
        label="Max"
        onPress={updateToMaxAmount}
        variant={ButtonVariants.Secondary}
      />
    </View>
  );
};

export default Amount;
