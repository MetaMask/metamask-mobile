import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import { useAmountValidation } from './useAmountValidation';
import { useToAddressValidation } from './useToAddressValidation';

export const useSendDisabled = () => {
  const { amountError } = useAmountValidation();
  const { toAddressError } = useToAddressValidation();
  const { to, value } = useSendContext();

  const sendDisabled = useMemo(
    () =>
      Boolean(amountError) ||
      Boolean(toAddressError) ||
      value === undefined ||
      value === null ||
      value === '' ||
      !to,
    [amountError, toAddressError, to, value],
  );

  return { sendDisabled };
};
