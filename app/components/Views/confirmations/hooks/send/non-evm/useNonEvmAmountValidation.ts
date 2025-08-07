import BN from 'bnjs4';
import { useCallback } from 'react';

import { isDecimal } from '../../../../../../util/number';
import { AssetType } from '../../../types/token';
import { useSendContext } from '../../../context/send-context';

export const validateAmountFn = ({
  amount,
  asset,
}: {
  amount?: string;
  asset?: AssetType;
}) => {
  if (!asset || amount === undefined || amount === null || amount === '') {
    return { invalidAmount: true };
  }
  if (!isDecimal(amount) || Number(amount) < 0) {
    return { invalidAmount: true };
  }
  if (new BN(amount).gt(new BN(asset.balance))) {
    return { insufficientBalance: true };
  }
  return {};
};

export const useNonEvmAmountValidation = () => {
  const { asset, value } = useSendContext();

  const validateNonEvmAmount = useCallback(
    () => validateAmountFn({ amount: value, asset }),
    [asset, value],
  );

  return { validateNonEvmAmount };
};
