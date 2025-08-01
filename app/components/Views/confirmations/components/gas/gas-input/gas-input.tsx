import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { add0x, Hex } from '@metamask/utils';

import { useStyles } from '../../../../../../component-library/hooks';
import { hexToDecimal, decimalToHex } from '../../../../../../util/conversions';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { validateGas } from '../../../utils/validations/gas';
import { TextFieldWithLabel } from '../../UI/text-field-with-label';
import styleSheet from './gas-input.styles';

export const GasInput = ({
  onChange,
  onErrorChange,
}: {
  onChange: (value: Hex) => void;
  onErrorChange: (error: string | boolean) => void;
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const initialGasLimit = hexToDecimal(
    transactionMeta?.txParams?.gas,
  ).toString();
  const [value, setValue] = useState(initialGasLimit);
  const [error, setError] = useState<string | boolean>(false);

  const validateGasCallback = useCallback((valueToBeValidated: string) => {
    const validationError = validateGas(valueToBeValidated);
    setError(validationError);
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      validateGasCallback(text);
      setValue(text);
      const updatedGasLimitHex = add0x(decimalToHex(text) as Hex);
      onChange(updatedGasLimitHex);
    },
    [onChange, validateGasCallback],
  );

  useEffect(() => {
    onErrorChange(error);
  }, [error, onErrorChange]);

  return (
    <View style={styles.container}>
      <TextFieldWithLabel
        error={error}
        inputType="gas"
        keyboardType="numeric"
        label={strings('transactions.gas_modal.gas_limit')}
        onChangeText={handleChange}
        testID="gas-input"
        value={value}
      />
    </View>
  );
};
