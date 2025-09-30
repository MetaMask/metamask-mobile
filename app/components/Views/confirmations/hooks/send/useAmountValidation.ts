import { useMemo } from 'react';

import { strings } from '../../../../../../locales/i18n';
import {
  isValidPositiveNumericString,
  toTokenMinimalUnit,
} from '../../utils/send';

import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';

export const useAmountValidation = () => {
  const { value } = useSendContext();
  const { decimals, rawBalanceBN } = useBalance();

  const amountError = useMemo(() => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (!isValidPositiveNumericString(value)) {
      return strings('send.invalid_value');
    }
    const amountInputBN = toTokenMinimalUnit(value, decimals ?? 0);
    if (rawBalanceBN.cmp(amountInputBN) === -1) {
      return strings('send.insufficient_funds');
    }
    return undefined;
  }, [decimals, rawBalanceBN, value]);

  return { amountError };
};
