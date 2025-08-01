import { useCallback } from 'react';

import { AssetType } from '../../../types/token';
import { isNativeToken } from '../../../utils/generic';
import { useSendContext } from '../../../context/send-context';

export const getNonEVMMaxValueFn = (asset?: AssetType) => {
  if (!asset || isNativeToken(asset)) {
    return undefined;
  }
  return asset.balance;
};

export const useNonEVMMaxAmount = () => {
  const { asset } = useSendContext();

  const getNonEVMMaxAmount = useCallback(
    () => getNonEVMMaxValueFn(asset),
    [asset],
  );

  return {
    getNonEVMMaxAmount,
  };
};
