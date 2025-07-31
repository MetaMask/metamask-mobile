import BN from 'bnjs4';
import { useMemo } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isDecimal } from '../../../../../util/number';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useEVMAmountValidation } from './useEVMAmountValidation';
import { useSendType } from './useSendType';

export const validateNonEVMAmountFn = ({
  amount,
  asset,
}: {
  amount: string;
  asset: AssetType;
}) => {
  if (new BN(amount).gt(new BN(asset.balance))) {
    return strings('transaction.insufficient');
  }
  return undefined;
};

export const useAmountValidation = () => {
  const { asset, value } = useSendContext();
  const { isEvmSendType } = useSendType();
  const { validateEVMAmount } = useEVMAmountValidation();

  const amountError = useMemo(() => {
    if (!asset || value === undefined || value === null || value === '') {
      return;
    }
    if (!isDecimal(value) || Number(value) < 0) {
      return strings('transaction.invalid_amount');
    }
    if (isEvmSendType) {
      return validateEVMAmount();
    }
    return validateNonEVMAmountFn({ amount: value, asset });
  }, [asset, isEvmSendType, validateEVMAmount, value]);

  return { amountError };
};
