import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';

import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { hexWEIToDecGWEI } from '../../../../../../util/conversions';
import { limitToMaximumDecimalPlaces } from '../../../../../../util/number';
import { useGasFeeEstimates } from '../../../hooks/gas/useGasFeeEstimates';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { convertGasInputToHexWEI } from '../../../utils/gas';
import { validatePriorityFee } from '../../../utils/validations/gas';
import { TextFieldWithLabel } from '../../UI/text-field-with-label';
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
  maxFeePerGas,
  onChange,
  onErrorChange,
}: {
  maxFeePerGas: Hex;
  onChange: (value: Hex) => void;
  onErrorChange: (error: string | boolean) => void;
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const initialPriorityFee = hexWEIToDecGWEI(
    transactionMeta?.txParams?.maxPriorityFeePerGas,
  ).toString();
  const [value, setValue] = useState(initialPriorityFee);
  const [error, setError] = useState<string | boolean>(false);

  const { gasFeeEstimates } = useGasFeeEstimates(
    transactionMeta?.networkClientId || '',
  );

  const validatePriorityFeeCallback = useCallback(
    (valueToBeValidated: string) => {
      const maxFeePerGasInDec = hexWEIToDecGWEI(maxFeePerGas).toString();
      const validationError = validatePriorityFee(
        valueToBeValidated,
        maxFeePerGasInDec,
      );
      setError(validationError);
    },
    [maxFeePerGas],
  );

  const handleChange = useCallback(
    (text: string) => {
      validatePriorityFeeCallback(text);
      setValue(text);
      const updatedPriorityFee = convertGasInputToHexWEI(text);
      onChange(updatedPriorityFee);
    },
    [onChange, validatePriorityFeeCallback],
  );

  useEffect(() => {
    validatePriorityFeeCallback(value);
  }, [validatePriorityFeeCallback, value]);

  useEffect(() => {
    onErrorChange(error);
  }, [error, onErrorChange]);

  const { latestPriorityFeeRange, historicalPriorityFeeRange } =
    (gasFeeEstimates as GasFeeEstimates) || {};

  const feeRangesExists = latestPriorityFeeRange && historicalPriorityFeeRange;

  return (
    <View style={styles.container}>
      <TextFieldWithLabel
        endAccessory={<Text variant={TextVariant.BodySM}>GWEI</Text>}
        error={error}
        inputType="priority-fee"
        keyboardType="numeric"
        label={strings('transactions.gas_modal.priority_fee')}
        onChangeText={handleChange}
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
