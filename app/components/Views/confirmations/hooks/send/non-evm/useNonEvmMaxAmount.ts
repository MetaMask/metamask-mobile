import { useCallback } from 'react';

import { AssetType } from '../../../types/token';
import { isNativeToken } from '../../../utils/generic';
import { useSendContext } from '../../../context/send-context';

export const getMaxValueFn = (asset?: AssetType) => {
  if (!asset || isNativeToken(asset)) {
    return undefined;
  }
  return asset.balance;
};

export const useNonEvmMaxAmount = () => {
  const { asset } = useSendContext();

  const getNonEvmMaxAmount = useCallback(() => getMaxValueFn(asset), [asset]);

  return {
    getNonEvmMaxAmount,
  };
};
