import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { add0x, Hex } from '@metamask/utils';

import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import {
  decGWEIToHexWEI,
  hexWEIToDecGWEI,
} from '../../../../../../util/conversions';
import styleSheet from './gas-price-input.styles';
import { validateGasPrice } from '../../../utils/gas-validations';
import { TextFieldWithLabel } from '../../UI/text-field-with-label';

export const GasPriceInput = ({
  onChange,
  onErrorChange,
}: {
  onChange: (value: Hex) => void;
  onErrorChange: (error: string | boolean) => void;
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const initialGasPrice = hexWEIToDecGWEI(
    transactionMeta?.txParams?.gasPrice,
  ).toString();
  const [value, setValue] = useState(initialGasPrice);
  const [error, setError] = useState<string | boolean>(false);

  const validateGasPriceCallback = useCallback((valueToBeValidated: string) => {
    const validationError = validateGasPrice(valueToBeValidated);
    setError(validationError);
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      validateGasPriceCallback(text);
      setValue(text);
      const updatedGasPrice = add0x(decGWEIToHexWEI(text) as Hex);
      onChange(updatedGasPrice);
    },
    [onChange, validateGasPriceCallback],
  );

  useEffect(() => {
    onErrorChange(error);
  }, [error, onErrorChange]);

  return (
    <View style={styles.container}>
      <TextFieldWithLabel
        endAccessory={<Text variant={TextVariant.BodySM}>GWEI</Text>}
        error={error}
        inputType="gas-price"
        keyboardType="numeric"
        label={strings('transactions.gas_modal.gas_price')}
        onChangeText={handleChange}
        testID="gas-price-input"
        value={value}
      />
    </View>
  );
};
