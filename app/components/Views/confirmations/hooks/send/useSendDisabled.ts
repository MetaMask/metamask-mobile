import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import useValidations from './useValidations';

const useSendDisabled = () => {
  const { amountError } = useValidations();
  const { transactionParams } = useSendContext();

  const sendDisabled = useMemo(() => {
    const { value, to } = transactionParams;
    return (
      Boolean(amountError) ||
      value === undefined ||
      value === null ||
      value === '' ||
      !to
    );
  }, [amountError, transactionParams]);

  return { sendDisabled };
};

export default useSendDisabled;
