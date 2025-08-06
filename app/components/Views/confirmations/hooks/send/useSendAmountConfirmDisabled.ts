import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import { useAmountValidation } from './useAmountValidation';

export const useSendAmountConfirmDisabled = () => {
  const { amountError } = useAmountValidation();
  const { value } = useSendContext();

  const isDisabled = useMemo(
    () =>
      Boolean(amountError) ||
      value === undefined ||
      value === null ||
      value === '',
    [amountError, value],
  );

  return { isDisabled };
};
