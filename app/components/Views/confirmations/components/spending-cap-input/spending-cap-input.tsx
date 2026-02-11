import React, { useCallback, useEffect, useState } from 'react';

import { ApproveComponentIDs } from '../../ConfirmationView.testIds';
import { ApproveMethod } from '../../types/approve';
import { validateSpendingCap } from '../../utils/validations/approve';
import { TextFieldWithLabel } from '../UI/text-field-with-label';

export const SpendingCapInput = ({
  approveMethod,
  initialValue,
  decimals,
  onChange,
  onErrorChange,
}: {
  approveMethod: ApproveMethod;
  initialValue: string;
  decimals: number;
  onChange: (value: string) => void;
  onErrorChange: (error: string | boolean) => void;
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | boolean>(false);

  const validateSpendingCapCallback = useCallback(
    (newSpendingCap: string) => {
      const validationError = validateSpendingCap(
        newSpendingCap,
        decimals,
        approveMethod,
      );
      setError(validationError);
    },
    [approveMethod, decimals],
  );

  const handleChange = useCallback(
    (text: string) => {
      const newSpendingCap = text.trim();
      validateSpendingCapCallback(newSpendingCap);
      setValue(newSpendingCap);
      onChange(newSpendingCap);
    },
    [onChange, validateSpendingCapCallback],
  );

  useEffect(() => {
    onErrorChange(error);
  }, [error, onErrorChange]);

  return (
    <TextFieldWithLabel
      error={error}
      inputType="spending-cap"
      keyboardType="numeric"
      onChangeText={handleChange}
      testID={ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT}
      value={value}
    />
  );
};
