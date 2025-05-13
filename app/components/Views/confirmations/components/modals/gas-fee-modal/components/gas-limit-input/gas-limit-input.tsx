import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';
import { add0x, Hex } from '@metamask/utils';

import { useStyles } from '../../../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../../../../../../component-library/components/Form/TextField';
import {
  hexToDecimal,
  decimalToHex,
} from '../../../../../../../../util/conversions';
import { strings } from '../../../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './gas-limit-input.styles';

export const GasLimitInput = ({
  onChange,
}: {
  onChange: (value: Hex) => void;
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const initialGasLimit = hexToDecimal(
    transactionMeta?.txParams?.gas,
  ).toString();
  const [value, setValue] = useState(initialGasLimit);

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);
      const updatedGasLimitHex = add0x(decimalToHex(text) as Hex);
      onChange(updatedGasLimitHex);
    },
    [onChange],
  );

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodyMD} style={styles.label}>
        {strings('transactions.gas_modal.gas_limit')}
      </Text>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numeric"
        onChangeText={handleChange}
        size={TextFieldSize.Lg}
        testID="gas-limit-input"
        value={value}
      />
    </View>
  );
};
