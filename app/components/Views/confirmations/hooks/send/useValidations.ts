import { useMemo } from 'react';

import { useSendContext } from '../../context/send-context';
import useValidateAmount from './useValidateAmount';

const useValidations = () => {
  const { asset, transactionParams } = useSendContext();
  const { validateAmount } = useValidateAmount();
  const amountError = useMemo(
    () => validateAmount(),
    [asset, transactionParams.from, transactionParams.value, validateAmount],
  );

  return { amountError };
};

export default useValidations;
