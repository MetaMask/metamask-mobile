import BN from 'bnjs4';
import { useCallback } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isDecimal, toTokenMinimalUnit } from '../../../../../util/number';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { Nft, TokenStandard } from '../../types/token';
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
  const { asset, value } = useSendContext();
  const { decimals, rawBalanceBN } = useBalance();

  const validateAmount = useCallback(async () => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (!isDecimal(value) || Number(value) < 0) {
      return strings('send.invalid_value');
    }
    if (asset?.standard === TokenStandard.ERC1155) {
      return validateERC1155Balance(asset as Nft, value);
    }
    return validateTokenBalance(value, decimals, rawBalanceBN);
  }, [asset, decimals, rawBalanceBN, value]);

  const { value: amountError } = useAsyncResult(validateAmount, [
    validateAmount,
  ]);

  return { amountError };
};
