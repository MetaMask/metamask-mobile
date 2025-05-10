import React, { useState } from 'react';
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
import { strings } from '../../../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../../../hooks/transactions/useTransactionMetadataRequest';
import {
  decGWEIToHexWEI,
  hexWEIToDecGWEI,
} from '../../../../../../../../util/conversions';
import styleSheet from './gas-price-input.styles';

export const GasPriceInput = ({
  onChange,
}: {
  onChange: (value: Hex) => void;
}) => {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { styles } = useStyles(styleSheet, {});
  const initialGasPrice = hexWEIToDecGWEI(
    transactionMeta.txParams.gasPrice,
  ).toString();
  const [value, setValue] = useState(initialGasPrice);

  const handleChange = (text: string) => {
    setValue(text);
    const hexWEI = decGWEIToHexWEI(text);
    onChange(add0x(hexWEI as Hex));
  };

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodyMD} style={styles.label}>
        {strings('transactions.gas_modal.gas_price')}
      </Text>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numeric"
        onChangeText={handleChange}
        size={TextFieldSize.Lg}
        testID="gas-price-input"
        value={value}
      />
    </View>
  );
};
