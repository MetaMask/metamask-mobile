import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
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
import { useGasFeeEstimates } from '../../../../../hooks/gas/useGasFeeEstimates';
import {
  hexWEIToDecGWEI,
  decGWEIToHexWEI,
} from '../../../../../../../../util/conversions';
import { limitToMaximumDecimalPlaces } from '../../../../../../../../util/number';
import styleSheet from './priority-fee-input.styles';

const InfoLabel = ({ children }: { children: React.ReactNode }) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Text variant={TextVariant.BodySM} style={styles.infoLabel}>
      {children}
    </Text>
  );
};

export const PriorityFeeInput = ({
  onChange,
}: {
  onChange: (value: Hex) => void;
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const initialPriorityFee = hexWEIToDecGWEI(
    transactionMeta?.txParams?.maxPriorityFeePerGas,
  ).toString();
  const [value, setValue] = useState(initialPriorityFee);

  const { gasFeeEstimates } = useGasFeeEstimates(
    transactionMeta?.networkClientId || '',
  );

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);
      const updatedPriorityFee = add0x(decGWEIToHexWEI(text) as Hex);
      onChange(updatedPriorityFee);
    },
    [onChange],
  );

  const { latestPriorityFeeRange, historicalPriorityFeeRange } =
    (gasFeeEstimates as GasFeeEstimates) || {};

  const feeRangesExists = latestPriorityFeeRange && historicalPriorityFeeRange;

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodyMD} style={styles.label}>
        {strings('transactions.gas_modal.priority_fee')}
      </Text>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numeric"
        onChangeText={handleChange}
        size={TextFieldSize.Lg}
        testID="priority-fee-input"
        value={value}
      />
      {feeRangesExists && (
        <View style={styles.infoContainer} testID="info-container">
          <InfoLabel>
            {strings('transactions.gas_modal.current_priority_fee', {
              min: limitToMaximumDecimalPlaces(
                parseFloat(latestPriorityFeeRange?.[0]),
                2,
              ),
              max: limitToMaximumDecimalPlaces(
                parseFloat(latestPriorityFeeRange?.[1]),
                2,
              ),
            })}
          </InfoLabel>
          <InfoLabel>
            {strings('transactions.gas_modal.historical_priority_fee', {
              min: limitToMaximumDecimalPlaces(
                parseFloat(historicalPriorityFeeRange?.[0]),
                2,
              ),
              max: limitToMaximumDecimalPlaces(
                parseFloat(historicalPriorityFeeRange?.[1]),
                2,
              ),
            })}
          </InfoLabel>
        </View>
      )}
    </View>
  );
};
