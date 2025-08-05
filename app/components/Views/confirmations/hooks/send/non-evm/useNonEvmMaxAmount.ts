import { useCallback } from 'react';

import { AssetType } from '../../../types/token';
import { isNativeToken } from '../../../utils/generic';
import { useSendContext } from '../../../context/send-context';

export const getMaxValueFn = (asset?: AssetType) => {
  if (!asset) {
    return { maxAmount: '0', balance: '0' };
  }
  if (isNativeToken(asset)) {
    return {
      maxAmount: undefined,
      balance: asset.balance,
    };
  }
  return {
    maxAmount: asset.balance,
    balance: asset.balance,
  };
};

export const useNonEvmMaxAmount = () => {
  const { asset } = useSendContext();

  const getNonEvmMaxAmount = useCallback(() => getMaxValueFn(asset), [asset]);

  return {
    getNonEvmMaxAmount,
  };
};
