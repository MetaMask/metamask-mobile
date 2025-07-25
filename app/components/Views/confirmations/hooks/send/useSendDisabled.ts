import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';

const useSendDisabled = () => {
  const { amountError, transactionParams } = useSendContext();

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
