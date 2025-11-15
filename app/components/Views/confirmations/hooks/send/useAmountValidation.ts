import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';

import { strings } from '../../../../../../locales/i18n';
import {
  isValidPositiveNumericString,
  toTokenMinimalUnit,
} from '../../utils/send';

import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';
import { useSendType } from './useSendType';

const MINIMUM_BITCOIN_TRANSACTION_AMOUNT = new BigNumber('0.000006');
const isValidBitcoinAmount = (value: string) => {
  const valueBN = new BigNumber(value);
  return valueBN.gte(MINIMUM_BITCOIN_TRANSACTION_AMOUNT);
};

export const useAmountValidation = () => {
  const { value } = useSendContext();
  const { decimals, rawBalanceBN } = useBalance();
  const { isBitcoinSendType } = useSendType();

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

    // This is a temporary fix for the bitcoin send type.
    // Once onAmountInput validation is implemented, this can be removed.
    if (isBitcoinSendType && !isValidBitcoinAmount(value)) {
      return strings('send.invalid_value');
    }
    return undefined;
  }, [decimals, isBitcoinSendType, rawBalanceBN, value]);

  return { amountError };
};
