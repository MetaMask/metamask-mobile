import BN from 'bnjs4';
import { useCallback } from 'react';

import { strings } from '../../../../../../../locales/i18n';
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
    return;
  }
  if (!isDecimal(amount) || Number(amount) < 0) {
    return strings('transaction.invalid_amount');
  }
  if (new BN(amount).gt(new BN(asset.balance))) {
    return strings('transaction.insufficient');
  }
  return undefined;
};

export const useNonEvmAmountValidation = () => {
  const { asset, value } = useSendContext();

  const validateNonEvmAmount = useCallback(
    () => validateAmountFn({ amount: value, asset }),
    [asset, value],
  );

  return { validateNonEvmAmount };
};
