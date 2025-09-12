import BN from 'bnjs4';
import { useMemo } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isDecimal } from '../../../../../util/number';
import { toTokenMinimalUnit } from '../../utils/send';

import { Nft } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';

export const validateERC1155Balance = (asset: Nft, value?: string) => {
  if (asset?.balance && value) {
    if (parseInt(value) > parseInt(asset.balance)) {
      return strings('send.insufficient_funds');
    }
  }
  return undefined;
};

export const validateTokenBalance = (
  amount: string,
  decimals: number,
  rawBalanceBN: BN,
) => {
  const amountInputBN = toTokenMinimalUnit(amount, decimals ?? 0);
  if (rawBalanceBN.cmp(amountInputBN) === -1) {
    return strings('send.insufficient_funds');
  }
  return undefined;
};

export const useAmountValidation = () => {
  const { value } = useSendContext();
  const { decimals, rawBalanceBN } = useBalance();

  const amountError = useMemo(() => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (!isDecimal(value) || Number(value) < 0) {
      return strings('send.invalid_value');
    }
    return validateTokenBalance(value, decimals, rawBalanceBN);
  }, [decimals, rawBalanceBN, value]);

  return { amountError };
};
