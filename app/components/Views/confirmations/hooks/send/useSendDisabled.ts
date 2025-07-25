import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import useAmountValidation from './useAmountValidation';

const useSendDisabled = () => {
  const { amountError } = useAmountValidation();
  const { to, value } = useSendContext();

  const sendDisabled = useMemo(
    () =>
      Boolean(amountError) ||
      value === undefined ||
      value === null ||
      value === '' ||
      !to,
    [amountError, to, value],
  );

  return { sendDisabled };
};

export default useSendDisabled;
