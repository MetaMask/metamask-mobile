import React, { useState } from 'react';
import { View } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';
import { add0x, Hex } from '@metamask/utils';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';

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
  hexWEIToDecGWEI,
  decGWEIToHexWEI,
} from '../../../../../../../../util/conversions';
import { limitToMaximumDecimalPlaces } from '../../../../../../../../util/number';
import { useGasFeeEstimates } from '../../../../../hooks/gas/useGasFeeEstimates';
import styleSheet from './max-base-fee-input.styles';

export const MaxBaseFeeInput = ({
  onChange,
}: {
  onChange: (value: Hex) => void;
}) => {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { styles } = useStyles(styleSheet, {});
  const initialMaxBaseFee = hexWEIToDecGWEI(
    transactionMeta.txParams.maxFeePerGas,
  ).toString();
  const [value, setValue] = useState(initialMaxBaseFee);

  const { gasFeeEstimates } = useGasFeeEstimates(
    transactionMeta.networkClientId,
  );

  const handleChange = (text: string) => {
    setValue(text);
    const hexWEI = decGWEIToHexWEI(text);
    onChange(add0x(hexWEI as Hex));
  };

  const { estimatedBaseFee, historicalBaseFeeRange } =
    (gasFeeEstimates as GasFeeEstimates) || {};

  const feeRangesExists = estimatedBaseFee && historicalBaseFeeRange;

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodyMD} style={styles.label}>
        {strings('transactions.gas_modal.max_base_fee')}
      </Text>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numeric"
        onChangeText={handleChange}
        size={TextFieldSize.Lg}
        testID="max-base-fee-input"
        value={value}
      />
      {feeRangesExists && (
        <View style={styles.infoContainer} testID="info-container">
          <Text variant={TextVariant.BodySM} style={styles.infoLabel}>
            {strings('transactions.gas_modal.estimated_base_fee', {
              value: limitToMaximumDecimalPlaces(
                parseFloat(estimatedBaseFee),
                2,
              ),
            })}
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.infoLabel}>
            {strings('transactions.gas_modal.historical_priority_fee', {
              min: limitToMaximumDecimalPlaces(
                parseFloat(historicalBaseFeeRange?.[0]),
                2,
              ),
              max: limitToMaximumDecimalPlaces(
                parseFloat(historicalBaseFeeRange?.[1]),
                2,
              ),
            })}
          </Text>
        </View>
      )}
    </View>
  );
};
