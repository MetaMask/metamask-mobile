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
import { validateMaxBaseFee } from '../../../utils/validations/gas';
import { TextFieldWithLabel } from '../../UI/text-field-with-label';
import styleSheet from './max-base-fee-input.styles';

const InfoLabel = ({ children }: { children: React.ReactNode }) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Text variant={TextVariant.BodySM} style={styles.infoLabel}>
      {children}
    </Text>
  );
};

export const MaxBaseFeeInput = ({
  maxPriorityFeePerGas,
  onChange,
  onErrorChange,
}: {
  maxPriorityFeePerGas: Hex;
  onChange: (value: Hex) => void;
  onErrorChange: (error: string | boolean) => void;
}) => {
  const transactionMeta = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const initialMaxBaseFee = hexWEIToDecGWEI(
    transactionMeta?.txParams?.maxFeePerGas,
  ).toString();
  const [value, setValue] = useState(initialMaxBaseFee);
  const [error, setError] = useState<string | boolean>(false);

  const { gasFeeEstimates } = useGasFeeEstimates(
    transactionMeta?.networkClientId || '',
  );

  const validateMaxBaseFeeCallback = useCallback(
    (valueToBeValidated: string) => {
      const maxPriorityFeeInDec =
        hexWEIToDecGWEI(maxPriorityFeePerGas).toString();

      const validationError = validateMaxBaseFee(
        valueToBeValidated,
        maxPriorityFeeInDec,
      );
      setError(validationError);
    },
    [maxPriorityFeePerGas],
  );

  const handleChange = useCallback(
    (text: string) => {
      validateMaxBaseFeeCallback(text);
      setValue(text);
      const updatedMaxBaseFee = convertGasInputToHexWEI(text);
      onChange(updatedMaxBaseFee);
    },
    [onChange, validateMaxBaseFeeCallback],
  );

  useEffect(() => {
    validateMaxBaseFeeCallback(value);
  }, [validateMaxBaseFeeCallback, value]);

  useEffect(() => {
    onErrorChange(error);
  }, [error, onErrorChange]);

  const { estimatedBaseFee, historicalBaseFeeRange } =
    (gasFeeEstimates as GasFeeEstimates) || {};

  const feeRangesExists = estimatedBaseFee && historicalBaseFeeRange;

  return (
    <View style={styles.container}>
      <TextFieldWithLabel
        endAccessory={<Text variant={TextVariant.BodySM}>GWEI</Text>}
        error={error}
        inputType="max-base-fee"
        keyboardType="numeric"
        label={strings('transactions.gas_modal.max_base_fee')}
        onChangeText={handleChange}
        testID="max-base-fee-input"
        value={value}
      />
      {feeRangesExists && (
        <View style={styles.infoContainer} testID="info-container">
          <InfoLabel>
            {strings('transactions.gas_modal.estimated_base_fee', {
              value: limitToMaximumDecimalPlaces(
                parseFloat(estimatedBaseFee),
                2,
              ),
            })}
          </InfoLabel>
          <InfoLabel>
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
          </InfoLabel>
        </View>
      )}
    </View>
  );
};
