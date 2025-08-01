import { useCallback } from 'react';

import { AssetType } from '../../types/token';
import { isNativeToken } from '../../utils/generic';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useEVMMaxAmount } from './useEVMMaxAmount';

export const getNonEVMMaxValueFn = (asset?: AssetType) => {
  if (!asset || isNativeToken(asset)) {
    return undefined;
  }
  return asset.balance;
};

export const useMaxAmount = () => {
  const { asset } = useSendContext();
  const { isEvmSendType, isNonEvmNativeSendType } = useSendType();
  const { getEVMMaxAmount } = useEVMMaxAmount();

  const getMaxAmount = useCallback(() => {
    if (isEvmSendType) {
      return getEVMMaxAmount();
    }
    return getNonEVMMaxValueFn(asset);
  }, [asset, getEVMMaxAmount, isEvmSendType]);

  return {
    getMaxAmount,
    isMaxAmountSupported: !isNonEvmNativeSendType,
  };
};
